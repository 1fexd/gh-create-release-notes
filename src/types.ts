export type LatestReleaseCommitSha = {
    repository: {
        latestRelease: Release
    }
}

export type Release = {
    tagCommit: { oid: string } | null,
    tagName: string | null
}

export type Commit = {
    sha: string,
    commit: {
        message: string,
        committer: {
            date: string
        },
        url: string
    }
}

export type CommitCompare = {
    commits: Commit[]
}
