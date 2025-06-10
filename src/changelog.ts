import { Octokit } from "@octokit/core";
import { Commit, LatestReleaseCommitSha, Release } from "./types";

export async function queryLatestRelease(octokit: Octokit, owner: string, repo: string): Promise<Release | null> {
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

export async function getCommits(octokit: Octokit, owner: string, repo: string, lastCommitSha: string, commitSha: string) {
    try {
        const response = await octokit.request("GET /repos/{owner}/{repo}/compare/{basehead}", {
            owner: owner,
            repo: repo,
            basehead: `${lastCommitSha}...${commitSha}`,
            headers: {
                "X-GitHub-Api-Version": "2022-11-28"
            }
        });

        return { response: response };
    } catch (e: any) {
        return { error: e };
    }
}

export function createChangelog(owner: string, repo: string, tag: string, latestNightlyRelease: Release | null, commits: Commit[]) {
    const releaseLines = ["# Included commits", ""];
    const stableRepoBaseUrl = `https://github.com/${owner}/${repo}`;
    const compareBaseUrl = `${stableRepoBaseUrl}/compare/`;
    const commitBaseUrl = `${stableRepoBaseUrl}/commit/`;

    for (let commit of commits) {
        // https://github.com/LinkSheet/LinkSheet/commit/c19d0e6d882fc62533efb03894bd1feebbaa2908
        const url = commitBaseUrl + commit.sha;
        const text = `${wrapInlineCodeBlock(truncateSha(commit.sha))}: ${sanitizeCommitMessage(commit)}`;
        const mdLink = createMarkdownLink(url, text);

        releaseLines.push(`* ${mdLink}`);
    }

    if (latestNightlyRelease !== null) {
        releaseLines.push("");

        const text = makeCompareString(
            wrapInlineCodeBlock(latestNightlyRelease.tagName!),
            wrapInlineCodeBlock(tag)
        );

        const url = makeCompareString(compareBaseUrl + latestNightlyRelease.tagName, tag);
        const mdLink = createMarkdownLink(url, text);

        releaseLines.push("Difference to latest stable release: " + mdLink);
    }

    const releaseMessage = releaseLines.join("\n");
    return releaseMessage;
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

function truncateSha(sha: string) {
    return sha.substring(0, 7);
}
