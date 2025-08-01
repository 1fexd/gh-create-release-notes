import { Commit } from "./types";

type IgnoreConfig = {
    accountId?: number
    regex: RegExp
}

type RewriteConfig = {
    regex: RegExp,
    replaceWith: string
}

const ignoreConfigs: IgnoreConfig[] = [
    {
        accountId: 1607653,
        regex: /^Merge remote-tracking branch 'origin\/\w+'$/
    },
    {
        regex: /.*Merge pull request #\d+ from weblate\/weblate-\w+-\w+\n\nTranslations update from Hosted Weblate$/
    },
    {
        regex: /^chore: Dependencies$/,
    },

];

const rewriteConfigs: RewriteConfig[] = [
    {
        regex: /^Translated using Weblate \((\w+)\)\n\nCurrently translated at (\d+\.\d)% \((\d+) of (\d+) strings\)\n\nTranslation: \w+\/\w+\nTranslate-URL: .+$/,
        replaceWith: "Translated: $1 ($2%, $3 of $4 strings)"
    }
]

function check(config: IgnoreConfig, commit: Commit) {
    const accountFlag = !config.accountId || commit.author?.id === config.accountId;
    const messageFlag = config.regex.test(commit.commit.message);

    return accountFlag && messageFlag;
}

export function rewriteCommit(commit: Commit) {
    const message = commit.commit.message;
    for (const config of rewriteConfigs) {
        if(config.regex.test(message)) {
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
