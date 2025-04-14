import * as core from "@actions/core";
import * as os from "os";
import { Octokit } from "@octokit/core";

const GITHUB_TOKEN = core.getInput("github-token") || process.env["GITHUB_TOKEN"];
const STABLE_REPO = core.getInput("stable-repo") || process.env["STABLE_REPO"];
const NIGHTLY_REPO = core.getInput("nightly-repo") || process.env["NIGHTLY_REPO"];
const LAST_COMMIT_SHA = core.getInput("last-commit-sha") || process.env["LAST_COMMIT_SHA"];
const COMMIT_SHA = core.getInput("commit-sha") || process.env["COMMIT_SHA"];

const HOME = os.homedir();

type LatestReleaseCommitSha = {
	repository: {
		latestRelease: Release
	}
}

type Release = {
	tagCommit: { oid: string } | null,
	tagName: string | null
}

type Commit = {
	sha: string,
	commit: {
		message: string,
		committer: {
			date: string
		},
		url: string
	}
}

type CommitCompare = {
	commits: Commit[]
}

async function queryLatestRelease(octokit: Octokit, owner: string, repo: string): Promise<Release | null> {
    return (await octokit.graphql<LatestReleaseCommitSha>(
			`query GetCommitShaFromLatestRelease($owner: String!, $repo: String!) {
            repository(owner: $owner, name: $repo) {
                latestRelease {
                    tagCommit {
                        oid
                    }

                    tagName
                }
            }
        }`, { owner: owner, repo: repo }
    )).repository.latestRelease;
}

function truncateSha(sha: string) {
	return sha.substring(0, 7);
}

async function run(): Promise<void> {
	if (!STABLE_REPO) {
		core.error(`Input "STABLE_REPO" not provided`);
		return;
	}

	if (!NIGHTLY_REPO) {
		core.error(`Input "NIGHTLY_REPO" not provided`);
		return;
	}

	if (!COMMIT_SHA) {
		core.error(`Input "COMMIT_SHA" not provided`);
		return;
	}

	// if (!LAST_COMMIT_SHA) {
	// 	core.error(`Input "LAST_COMMIT_SHA" not provided`);
	// 	return;
	// }

	const octokit = new Octokit({ auth: GITHUB_TOKEN });

	const nightlySplit = NIGHTLY_REPO.split("/");
	const nightlyOwner = nightlySplit[0];
	const nightlyRepo = nightlySplit[1];

	const stableSplit = STABLE_REPO.split("/");
	const stableOwner = stableSplit[0];
	const stableRepo = stableSplit[1];
	core.info(`Stable repo: ${stableOwner}/${stableRepo}`);
	core.info(`Nightly repo: ${nightlyOwner}/${nightlyRepo}`);

	const latestNightlyRelease = await queryLatestRelease(octokit, nightlyOwner, nightlyRepo);
	const lastCommitSha = latestNightlyRelease?.tagName;

	if (!lastCommitSha || lastCommitSha === "0000000000000000000000000000000000000000") {
		core.warning("No last commit found, setting init release note");
		core.setOutput("releaseNote", "* Initial release");
		return;
	}

	const response = await octokit.request("GET /repos/{owner}/{repo}/compare/{basehead}", {
		owner: stableOwner,
		repo: stableRepo,
		basehead: `${lastCommitSha}...${COMMIT_SHA}`,
		headers: {
			"X-GitHub-Api-Version": "2022-11-28"
		}
	});

	const compared = response.data as CommitCompare;
	const commits = compared.commits.reverse();

	const releaseLines = ["# Included commits", ""];
	const stableRepoBaseUrl = `https://github.com/${stableOwner}/${stableRepo}`;
	const compareBaseUrl = `${stableRepoBaseUrl}/compare/`;
	const commitBaseUrl = `${stableRepoBaseUrl}/commit/`;
	const lastCommitCompareUrl = compareBaseUrl + lastCommitSha;

	const shortCommitSha = truncateSha(COMMIT_SHA);

	for (let commit of commits) {
		// https://github.com/LinkSheet/LinkSheet/commit/c19d0e6d882fc62533efb03894bd1feebbaa2908
		const url = commitBaseUrl + commit.sha;
		const text = `${wrapInlineCodeBlock(truncateSha(commit.sha))}: ${sanitizeCommitMessage(commit)}`;
		const mdLink = createMarkdownLink(url, text);

		releaseLines.push(`* ${mdLink}`);
	}

	if (latestNightlyRelease !== null) {
		const tagCompareUrl = compareBaseUrl + latestNightlyRelease.tagName;
		releaseLines.push("");

		const text = makeCompareString(
			wrapInlineCodeBlock(truncateSha(latestNightlyRelease.tagName!)),
			wrapInlineCodeBlock(shortCommitSha)
		);

		const url = makeCompareString(tagCompareUrl, COMMIT_SHA);
		const mdLink = createMarkdownLink(url, text);

		releaseLines.push("Difference to latest stable release: " + mdLink);
	}

	const releaseMessage = releaseLines.join("\n");

	core.info(releaseMessage);
	core.setOutput("releaseNote", releaseMessage);
}

const ignoreCommitMsgLines: RegExp[] = [/^Translation: LinkSheet\/.+$/, /^Translate-URL: https:\/\/.*$/];

function shouldIgnore(line: string) {
	if (line.length === 0) {
		return true;
	}

	for (const ignore of ignoreCommitMsgLines) {
		if (ignore.exec(line)) {
			return true;
		}
	}

	return false;
}

function sanitizeCommitMessage(commit: Commit) {
	return commit.commit.message.split("\n").filter(line => !shouldIgnore(line)).join(" ⤶ ");
}

function wrapInlineCodeBlock(str: string) {
	return "`" + str + "`";
}

function createMarkdownLink(url: string, text: string) {
	return `[${text}](${url})`;
}

function makeCompareString(compare: string, to: string) {
	return compare + "..." + to;
}


run();
