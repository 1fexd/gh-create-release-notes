import { Commit } from "./types";

type IgnoreConfig = {
    accountId?: number
    regexes: Array<RegExp>
}

type RewriteConfig = {
    regex: RegExp,
    replaceWith: string
}
// 58902674
const ignoreConfigs: IgnoreConfig[] = [
    {
        // accountId: 1607653,
        regexes: [/^Merge\s*(?:remote-tracking)?\s*branch '.+'$/]
        // regex: /^Merge remote-tracking branch 'origin\/\w+'$/
    },
    {
        regexes: [/.*Merge pull request #\d+ from weblate\/weblate-\w+-\w+\n\nTranslations update from Hosted Weblate$/]
    },
    {
        regexes: [/^chore:.+$/]
    },
    {
        regexes: [
            /^wip.+$/,
            /^fix: Build$/,
            /^fix: Import$/
        ]
    }
];

const rewriteConfigs: RewriteConfig[] = [
    {
        regex: /^Translated using Weblate \((.+)\)\n\nCurrently translated at (\d+\.\d)% \((\d+) of (\d+) strings\)\n\nTranslation: .+\/.+\nTranslate-URL: .+$/,
        replaceWith: "Translated: $1 ($2%, $3 of $4 strings)"
    }
]

function check(config: IgnoreConfig, commit: Commit) {
    const accountFlag = !config.accountId || commit.author?.id === config.accountId;
    if (!accountFlag) return false;

    for (const regex of config.regexes) {
        const messageFlag = regex.test(commit.commit.message);
        if (messageFlag) return true;
    }

    return false;
}

export function rewriteCommit(commit: Commit) {
    const message = commit.commit.message;
    for (const config of rewriteConfigs) {
        if (config.regex.test(message)) {
            return message.replace(config.regex, config.replaceWith)
        }
    }

    return null;
}

export function checkCommit(commit: Commit) {
    return ignoreConfigs.some(c => check(c, commit));
}

export function filterCommits(commits: Commit[]): Commit[] {
    return commits.filter(c => !checkCommit(c));
}
