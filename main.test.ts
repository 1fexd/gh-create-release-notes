import { createChangelog, getCommits, queryLatestRelease } from "./src/changelog";
import { Octokit } from "@octokit/core";
import { CommitCompare, Release } from "./src/types";
import { filterCommits } from "./src/MessageHelper";

test("test", async () => {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const lastCommitSha = "7fbd37804af31dc195d6f9c3e52a7fc1548298d0";
    const commitSha = "257f6686df2b2ad4291383c124f570ad8e9bd04c";
    const owner = "LinkSheet";
    const repo = "LinkSheet";
    const response = await getCommits(
        octokit,
        owner,
        repo,
        lastCommitSha,
        commitSha
    );

    const nightlyOwner = owner;
    const nightlyRepo = "nightly";
    // const latestNightlyRelease = await queryLatestRelease(octokit, nightlyOwner, nightlyRepo);
    const latestNightlyRelease : Release =  {
        tagCommit: null,
        tagName: "nightly-2025060402"
    };
    const compared = response.response!.data as CommitCompare;
    const commits = filterCommits(compared.commits.reverse());
    const changelog = createChangelog(owner, repo, "nightly-2025061001", latestNightlyRelease, commits);
    console.log(changelog);
});
