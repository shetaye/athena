import { knex } from '@/db';
import { ResourceNotFoundError } from "@/errors";
import { tAction } from "athena-common";
import logger from '@/logging';


// NOTE: Does NOT validate the action once retrieved
export async function getAction(
  proposal: string,
  index: number
): Promise<tAction> {
  const queryResults = await knex
    .select('*')
    .from('action')
    .where('proposal_id', proposal)
    .andWhere('id', index);
  if (queryResults.length < 1) {
    throw new ResourceNotFoundError('action', index.toString());
  }
  return JSON.parse(queryResults[0].action_data);
}

// Gets all actions on a proposal
// NOTE: Does NOT validate retrieved actions
export async function getActions(proposal: string): Promise<tAction[]> {
  const queryResults = await knex
    .select('*')
    .from('action')
    .where('proposal_id', proposal);
  const actionList: tAction[] = [];
  queryResults.forEach((actionRow) => {
    actionList[actionRow.id] = JSON.parse(actionRow.action_data);
  });
  return actionList;
}

// Creates an action
// NOTE: Does NOT validate action before creating
export async function createAction(
  proposal: string,
  index: number,
  action: tAction
): Promise<number> {
  await knex
    .insert({
      id: index,
      proposal_id: proposal,
      action_data: JSON.stringify(action),
    })
    .into('action');
  logger.info(`Created action ${index} on ${proposal}`, {
    proposal,
    index,
    action,
  });
  return index;
}

// Deletes an action and adjusts all indexes
// NOTE: Does NOT revalidate the action list
export async function removeAction(
  proposal: string,
  index: number
): Promise<void> {
  await knex
    .table('action')
    .where('proposal_id', proposal)
    .andWhere('id', index)
    .del();
  // Fill hole
  await knex
    .table('action')
    .decrement('id')
    .where('proposal_id', proposal)
    .andWhere('id', '>', index)
    .orderBy('id', 'asc');
  logger.info(`Removed action ${index} on ${proposal}`, { index, proposal });
}


