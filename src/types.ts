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
        author: {
            name: string,
            email: string,
            date: string
        }
        committer: {
            name: string,
            email: string,
            date: string
        },
        url: string
    },
    author: {
        login: string,
        id: number
    },
    committer: {
        login: string,
        id: number
    },
}

export type CommitCompare = {
    commits: Commit[]
}
