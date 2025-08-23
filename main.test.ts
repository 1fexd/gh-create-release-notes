import { createChangelog, getCommits, queryLatestRelease } from "./src/changelog";
import { Octokit } from "@octokit/core";
import { CommitCompare, Release } from "./src/types";
import { filterCommits } from "./src/MessageHelper";

test("test", async () => {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // const latestNightlyRelease = await queryLatestRelease(octokit, nightlyOwner, nightlyRepo);
    const previousRelease: Release = {
        tagCommit: null,
        tagName: "nightly-2025080301"
    };
    const latestRelease = "nightly-2025082303"

    const owner = "LinkSheet";
    const repo = "LinkSheet";
    const response = await getCommits(
        octokit,
        owner,
        repo,
        previousRelease.tagName!,
        latestRelease
    );

    const compared = response.response!.data as CommitCompare;
    const commits = filterCommits(compared.commits.reverse());
    const changelog = createChangelog(owner, repo, previousRelease.tagName, latestRelease, commits);
    console.log(changelog);
});
