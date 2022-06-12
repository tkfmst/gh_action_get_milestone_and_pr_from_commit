import * as core from '@actions/core'
import * as github from '@actions/github'
import {Octokit} from '@octokit/core'
// import {wait} from './wait'

interface ArgsOfGetCommitAndMilestoneFromPR {
  pullNumber: number
  repoName: string
  repoOwner: string
}

interface ResultOfCommitAndMilestoneFromPR {
  repository: string
  pullRequest: {
    id: string
    title: string
    commits?: {
      nodes: [
        {
          commit: {
            message: string
            associatedPullRequests?: {
              noddes: [
                {
                  number: number
                  title: string
                  milestone?: {
                    number: number
                    title: string
                  }
                }
              ]
            }
          }
        }
      ]
      pageInfo: {
        endCursor: string
        hasNextPage: boolean
      }
    }
  }
}

async function getCommitAndMilestoneFromPR(
  octokit: Octokit,
  args: ArgsOfGetCommitAndMilestoneFromPR
): Promise<ResultOfCommitAndMilestoneFromPR> {
  const result: ResultOfCommitAndMilestoneFromPR = await octokit.graphql(
    `
      query PullReqLinkedCommitAndMilestone($pull_number: Int!, $repo_name: String!, $repo_owner: String!, $cursor: String!) {
        repository(name: $repo_name, owner: $repo_owner) {
          id
          pullRequest(number: $pull_number) {
            id
            title
            commits(first: 100, after: $cursor) {
              nodes {
                commit {
                  message
                  associatedPullRequests(first: 1) {
                    nodes {
                      number
                      title
                      milestone {
                        number_
                        title
                      }
                    }
                  }
                }
              }
              pageInfo {
                endCursor
                hasNextPage
              }
            }
          }
        }
      }
    `,
    {
      pull_number: args.pullNumber,
      repo_name: args.repoName,
      repo_owner: args.repoOwner,
      curssor: ''
    }
  )
  return result
}

async function run(): Promise<void> {
  try {
    const token = core.getInput('token')

    const payloadContext = github.context.payload
    if (payloadContext.repository == null) {
      throw new Error("Can't find repository")
    }
    if (payloadContext.repository.full_name == null) {
      throw new Error("Can't find repository.full_name")
    }
    if (payloadContext.pull_request == null) {
      throw new Error("Can't find pull_request")
    }

    const repoOwner = payloadContext.repository.owner
    const repoOwnerLogin = payloadContext.repository.owner
    const repoNames = payloadContext.repository.full_name.split('/')
    const pullNumber = payloadContext.pull_request.number

    const octokit: Octokit = github.getOctokit(token)

    const args: ArgsOfGetCommitAndMilestoneFromPR = {
      pullNumber,
      repoName: repoNames[1],
      repoOwner: repoNames[0]
    }

    const commitAndMilestones = getCommitAndMilestoneFromPR(octokit, args)

    console.log(args)
    console.log(JSON.stringify(result))
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
