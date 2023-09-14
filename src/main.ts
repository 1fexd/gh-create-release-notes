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
    latestRelease: {
      tagCommit: {
        oid: string
      } | null,
      tagName: string | null
    }
  }
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

async function queryLatestRelease(octokit: Octokit, owner: string, repo: string) {
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

function shortCommitSha(sha: string) {
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

  if (!LAST_COMMIT_SHA) {
    core.error(`Input "LAST_COMMIT_SHA" not provided`);
    return;
  }

  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  const stableSplit = STABLE_REPO.split("/");
  const stableOwner = stableSplit[0];
  const stableRepo = stableSplit[1];
  core.info(`${stableOwner}/${stableRepo}`);

  const latestStableRelease = await queryLatestRelease(octokit, stableOwner, stableRepo);
  if (!latestStableRelease.tagCommit) {
    core.error("No latest release in stable repo found!");
    return;
  }

  const nightlySplit = NIGHTLY_REPO.split("/");
  const nightlyOwner = nightlySplit[0];
  const nightlyRepo = nightlySplit[1];

  core.info(`${nightlyOwner}/${nightlyRepo}`);

  const response = await octokit.request("GET /repos/{owner}/{repo}/compare/{basehead}", {
    owner: stableOwner,
    repo: stableRepo,
    basehead: `${LAST_COMMIT_SHA}...${COMMIT_SHA}`,
    headers: {
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });

  const compared = response.data as CommitCompare;
  const commits = compared.commits.reverse();

  const releaseLines = ["# Included commits", ""];

  for (let commit of commits) {
    releaseLines.push(`* [${shortCommitSha(commit.sha)}: ${commit.commit.message}](${commit.commit.url})`);
  }

  releaseLines.push("");
  releaseLines.push(`Difference to latest stable release: [${shortCommitSha(latestStableRelease.tagName!)}...${shortCommitSha(COMMIT_SHA)}](https://github.com/${stableOwner}/${stableRepo}/compare/${latestStableRelease.tagName}...${COMMIT_SHA})`);

  const releaseMessage = releaseLines.join("\n");

  core.info(releaseMessage);
  core.setOutput("releaseNote", releaseMessage);
}

run();
