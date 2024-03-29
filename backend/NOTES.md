# Commands

## create proposal <duration> <name>

## cancel proposal <id>

## update proposal <id> <field> <new value>

## refresh proposal <id>

## add action <id> <action>

## replace action <id> <index> <new action>

## remove action <id> <index>

## run proposal <id>

## clear vote <id>

Opens the proposal to voting. NOTE: No changes to the proposal will be allowed after this.

# Actions

## Kick

`user`\
`reason`

## Ban

`user`\
`reason`

## Create role

`name`

## Destroy role

`role`

## Change role assignment

`role`
`users*`

## Grant role - Shorthand for Change assignments for only grants

`role`\
`users*`

## Revoke role - Shorthand for Change assignments for only revocations

`role`\
`users*`

## Change role permissions

`role`\
`permissions*`

## Allow permissions - Shorthand for Change permissions for only allows

`role`\
`permissions*`

## Prohibit permissions - Shorthand for Change permissions for only prohibits

`role`\
`permissions*`

## Change permission override

`channel`\
`subject`\
`permissions*`

## Allow permission override - Shorthand for Change permissions override for only allows

`channel`\
`subject`\
`permissions*`

## Prohibit permission override - Shorthand for Change permissions override for only prohibits

`channel`\
`subject`\
`permissions*`

## Unset permission override - Shorthand for Change permissions override for only unsets

`channel`\
`subject`\
`permissions*`

## Change role setting

`role`\
`setting`\
`value` (boolean)

## Move role

`role`\
`above|below`\ (choose 1)
`subject`

## Move channel

`channel`\
`above|below`\ (choose 1)
`subject`

## Create channel

`name`
`type`

## Destroy channel

`channel`

## Change server setting

`setting`
`value`

## Change channel setting

`channel`
`setting`
`value`

# Parameter reference types

i339838865370120192 - ID\
"General 2" - Exact name\
<@!120704767843368961> or <#339838865370120193> or <@&344621156441128962> - Mention\
\*3 - Output reference

# Permission format

+Permission - Allow\
-Permission - Prohibit\
~Permission - Unset (only used by overrides)

# Example commands to make a proposal

create proposal 10h Big fix\
update proposal description 7df4d Fixes a really big problem!\
add action 7df4d destroy role "Old Admin"\
add action 7df4d create role Admin\
add action 7df4d create channel New General
add action 7df4d grant role *2 @Jonas \
add action 7df4d update permissions *2 +Delete Messages +Send Messages\
add action 7df4d update permissions override "General 2" *2 ~Connect
add action 7df4d move role *2 above @everyone
add action 7df4d move channel \*3 below "General 2"

# Components

1. Command parsing - Parse out commands and execute them
2. Proposal timing - start a timer at the beginning of duration and check votes by end
3. Proposal management - Synchronize DB and messages, update DB, implement proposals

# Embed

```json
{
  "embed": {
    "description": "Fixes a really big problem!",
    "color": 5747153,
    "timestamp": "2020-08-12T15:34:05.634Z",
    "footer": {
      "icon_url": "https://cdn.discordapp.com/embed/avatars/0.png",
      "text": "Proposed by @Jonas"
    },
    "title": "Big Fix",
    "fields": [
      {
        "name": "Actions",
        "value": "1. Destroy role \"Old Admin\"\n2. Create role \"Admin\"\n3. Create channel \"New General\"\n4. Grant role \"Admin\" to @Jonas etc."
      },
      {
        "name": "👍",
        "value": "4",
        "inline": true
      },
      {
        "name": "👎",
        "value": "2",
        "inline": true
      }
    ]
  }
}
```

# Proposal status codes

`BUILDING` Created, but hasn't been opened to vote

`RUNNING` Opened to vote

`PASSED` Passed the vote, successfully implemented

`FAILED` Did not pass the vote

`EXECUTION_ERROR` Passed the vote, could not be implemented

`CANCELLED` Cancelled before expiration

# Future features

Status evaluation: status command will check the bots perms and list any it's missing (and the actions it can't do without those permissions). It will also list any problems in the role hiearchy (immunity)

Add emoji actions (create, destroy, rename)

Server setting to set the proposal channel

Move proposal command

Extend voting period during runtime

Bring the proposal back to building during runtime

Alerts when a proposal finishes

Check if the bot permissions allow it to execute an action before adding it

Add voice moderation actions (mute, deafen, move)

Nonexistent resource errors should tell you what resource doesn't exist

Quorums: Custom quorums and vote ratio requirements beyond a simple majority no-quorum requirement

Vote permission: A custom permission to allow or prohibit members from voting

Fleshed out channel and server setting: Full support of all settings, multiple explicit content levels

Atomic Proposals: After an error, the proposal should undo its work

More clear wording when working with categories: It isn't immediately clear in some cases if what your working with is a category or a channel (eg. `move channel` also is meant to move categories). This could become standard, since categories _are just channels_, but I should pick either always calling categories 'parent channels' or always calling them categories (and making dedicated commands for them, like `move category`)

# Future fixes

Error handling & Fault Tolerance: Action validation should gracefully fail and properly inform the user where exactly the error occured. Failures during execution should also gracefully fail and the user should be allowed to retry execution.

Better fetching: I should make use of member fetch queries to speed up member searching when resolving usernames
