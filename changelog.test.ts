import { queryLatestRelease } from "./src/changelog";
import { Octokit } from "@octokit/core";
import { Commit } from "./src/types";
import { checkCommit } from "./src/MessageHelper";

test("changelog test", async () => {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const response = await queryLatestRelease(octokit, "LinkSheet", "nightly")
    console.log(response);
});

test("test ignore commit", async () => {
    const commit: Commit = {
        sha: "4854f06c2d2dbebff5067969f480fa6677897bff",
        commit: {
            message: "Merge remote-tracking branch 'origin/master'",
            author: {
                name: "Hosted Weblate",
                email: "hosted@weblate.org",
                date: "2025-06-09T20:09:55Z"
            },
            committer: {
                name: "Hosted Weblate",
                email: "hosted@weblate.org",
                date: "2025-06-09T20:09:55Z"
            },
            url: "https://api.github.com/repos/LinkSheet/LinkSheet/git/commits/4854f06c2d2dbebff5067969f480fa6677897bff",
        },
        author: {
            login: "weblate",
            id: 1607653
        },
        committer: {
            login: "weblate",
            id: 1607653
        }
    };
    const result = checkCommit(commit);
    expect(result).toBeTruthy();
});

test("test ignore commit 2", async () => {
    const commit: Commit = {
        sha: "26be404790c996a03879911f89fb70590cd1f15b",
        commit: {
            "message": "fix: CI (maybe)",
            author: {
                name: "1fexd",
                email: "PGFvy85nC@protonmail.com",
                date: "2025-06-09T20:09:43Z"
            },
            committer: {
                name: "1fexd",
                email: "PGFvy85nC@protonmail.com",
                date: "2025-06-09T20:09:43Z"
            },
            url: "https://api.github.com/repos/LinkSheet/LinkSheet/commits/26be404790c996a03879911f89fb70590cd1f15b",
        },
        author: {
            login: "1fexd",
            id: 58902674
        },
        committer: {
            login: "1fexd",
            id: 58902674
        }
    };
    const result = checkCommit(commit);
    expect(result).toBeFalsy();
});
