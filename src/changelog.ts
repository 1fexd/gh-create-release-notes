import { Octokit } from "@octokit/core";
import { Commit, LatestReleaseCommitSha, Release } from "./types";
import { rewriteCommit } from "./MessageHelper";

export async function queryLatestRelease(octokit: Octokit, owner: string, repo: string): Promise<Release | null> {
    const response = await octokit.graphql<LatestReleaseCommitSha>(
        `query GetCommitShaFromLatestRelease($owner: String!, $repo: String!) {
            repository(owner: $owner, name: $repo) {
                latestRelease {
                    tagCommit {
                        oid
                    }

                    tagName
                }
            }
        }`,
        { owner: owner, repo: repo }
    );

    return response.repository.latestRelease;
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

export function createChangelog(owner: string, repo: string, previousTag: string | null, tag: string, commits: Commit[]) {
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

    if (previousTag !== null) {
        releaseLines.push("");

        const text = makeCompareString(
            wrapInlineCodeBlock(previousTag),
            wrapInlineCodeBlock(tag)
        );

        const url = makeCompareString(compareBaseUrl + previousTag, tag);
        const mdLink = createMarkdownLink(url, text);

        releaseLines.push("Difference to latest stable release: " + mdLink);
    }

    const releaseMessage = releaseLines.join("\n");
    return releaseMessage;
}

function sanitizeCommitMessage(commit: Commit) {
    const message = rewriteCommit(commit) ?? commit.commit.message;
    return message.split("\n").join(" ⤶ ");
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
