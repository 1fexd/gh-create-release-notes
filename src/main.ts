import * as core from "@actions/core";
import * as os from "os";
import { Octokit } from "@octokit/core";
import { createChangelog, getCommits, queryLatestRelease } from "./changelog";
import { CommitCompare } from "./types";
import { filterCommits } from "./MessageHelper";

const GITHUB_TOKEN = core.getInput("github-token") || process.env["GITHUB_TOKEN"];
const STABLE_REPO = core.getInput("stable-repo") || process.env["STABLE_REPO"];
const NIGHTLY_REPO = core.getInput("nightly-repo") || process.env["NIGHTLY_REPO"];
const LAST_COMMIT_SHA = core.getInput("last-commit-sha") || process.env["LAST_COMMIT_SHA"];
const COMMIT_SHA = core.getInput("commit-sha") || process.env["COMMIT_SHA"];
const NIGHTLY_TAG = core.getInput("nightly-tag") || process.env["NIGHTLY_TAG"];

const HOME = os.homedir();

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

    if (!NIGHTLY_TAG) {
        core.error(`Input "NIGHTLY_TAG" not provided`);
        return;
    }

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
    const tagCommit = latestNightlyRelease?.tagCommit?.oid;
    const latestTagName = latestNightlyRelease?.tagName;

    if (!latestNightlyRelease || !tagCommit || tagCommit === "0000000000000000000000000000000000000000") {
        core.warning("No last commit found, setting init release note");
        core.setOutput("releaseNote", "* Initial release");
        return;
    }

    if (tagCommit && latestTagName) {
        const response = await getCommits(octokit, stableOwner, stableRepo, latestTagName, NIGHTLY_TAG);
        if (!response.response) {
            core.error(`Failed to fetch commits between ${latestTagName} and ${NIGHTLY_TAG}: ${response.error}!`);
            return;
        }

        const compared = response.response.data as CommitCompare;
        const commits = filterCommits(compared.commits.reverse());
        const releaseMessage = createChangelog(stableOwner, stableRepo, COMMIT_SHA, latestNightlyRelease, commits);
        core.info(releaseMessage);
        core.setOutput("releaseNote", releaseMessage);
    }
}

run();
