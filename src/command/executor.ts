import {
  validateActions,
  removeAction,
  getActions,
  getNextIndex,
  validateAction,
  createAction,
  insertAction,
  replaceAction,
} from '../action';
import {
  refreshProposalMessage,
  getProposal,
  ProposalStatus,
  createProposal,
  generateProposalEmbed,
  setProposalMessage,
  gIntervalList,
  setProposalStatus,
  deleteProposal,
  getMessageObject,
  setProposalDuration,
  setExpirationDate,
  scheduleProposal,
  clearVote,
  handleProposalExpire,
  setProposalDescription,
} from '../proposal';
import {
  Command,
  tCommand,
  globalHelp,
  proposalsHelp,
  votingHelp,
  actionsHelp,
} from '.';
import { Message } from 'discord.js';
import {
  OutOfBoundsError,
  AuthorizationError,
  StateError,
  ActionValidationFailureError,
  ActionsValidationFailureError,
  CommandSyntaxError,
} from '../errors';

export async function executeCommand(
  command: tCommand,
  messageObject: Message
) {
  // I choose an if chain over a switch statement
  // because each switch case shares it's
  // scope with other switch cases

  // CREATE PROPOSAL
  if (command.command == Command.CreateProposal) {
    const proposal = await createProposal(
      command.name,
      command.duration,
      messageObject
    );
    const embed = generateProposalEmbed(proposal);
    const proposalMessage = await messageObject.channel.send(embed);

    await setProposalMessage(proposal.id, proposalMessage);
  }

  // CANCEL PROPOSAL
  if (command.command == Command.CancelProposal) {
    const proposal = await getProposal(command.id);
    if (proposal.server != messageObject.guild.id) {
      throw new OutOfBoundsError(
        'Proposals can only be used in their own guild'
      );
    }
    if (proposal.author != messageObject.author.id) {
      throw new AuthorizationError('cancel that proposal, only the author is');
    }
    if (proposal.status != ProposalStatus.Running) {
      throw new StateError('A proposal must be running to be cancelled');
    }
    if (gIntervalList[command.id]) clearTimeout(gIntervalList[command.id]);
    await setProposalStatus(proposal.id, ProposalStatus.Cancelled);
    proposal.status = ProposalStatus.Cancelled;
    await refreshProposalMessage(messageObject.client, proposal, true, true);
  }

  // DESTROY PROPOSAL
  if (command.command == Command.DestroyProposal) {
    const proposal = await getProposal(command.id);
    if (proposal.server != messageObject.guild.id) {
      throw new OutOfBoundsError(
        'Proposals can only be used in their own guild'
      );
    }
    if (proposal.author != messageObject.author.id) {
      throw new AuthorizationError(
        'Only the proposal author can destroy a proposal'
      );
    }
    if (proposal.status == ProposalStatus.Running) {
      throw new StateError(
        'A running proposal must be cancelled before being destroyed'
      );
    }
    await deleteProposal(command.id);
    const message = await getMessageObject(messageObject.client, proposal);
    await message.delete();
  }

  // UPDATE PROPOSAL
  if (command.command == Command.UpdateProposal) {
    const proposal = await getProposal(command.id);
    if (proposal.server != messageObject.guild.id) {
      throw new OutOfBoundsError(
        'Proposals can only be used in their own guild'
      );
    }
    if (proposal.author != messageObject.author.id) {
      throw new AuthorizationError(
        'Only the proposal author can update a proposal'
      );
    }
    if (proposal.status != ProposalStatus.Building) {
      throw new StateError(
        'You can only update a proposal that is being built'
      );
    }
    if (command.field == 'description') {
      const description = command.value as string;
      if (description.length > 1024) return;
      proposal.description = description;
      await setProposalDescription(proposal.id, description);
    }
    if (command.field == 'duration') {
      const duration = command.value as number;
      proposal.duration = duration;
      await setProposalDuration(proposal.id, duration);
    }
    await refreshProposalMessage(messageObject.client, proposal, false, true);
  }

  // REFRESH PROPOSAL
  if (command.command == Command.RefreshProposal) {
    const proposal = await getProposal(command.id);
    if (proposal.server != messageObject.guild.id) {
      throw new Error('Proposals can only be used in their own guild');
    }
    await refreshProposalMessage(
      messageObject.client,
      proposal,
      proposal.status != ProposalStatus.Building,
      true
    );
  }

  // RUN PROPOSAL
  if (command.command == Command.RunProposal) {
    const proposal = await getProposal(command.id);
    if (proposal.server != messageObject.guild.id) {
      throw new OutOfBoundsError(
        'Proposals can only be used in their own guild'
      );
    }
    if (proposal.author != messageObject.author.id) {
      throw new AuthorizationError(
        'Only the proposal author can run the proposal'
      );
    }
    if (proposal.status != ProposalStatus.Building) {
      throw new StateError('Cannot run an already running or closed proposal');
    }
    const expirationDate = new Date(Date.now() + proposal.duration * 1000);
    await setExpirationDate(proposal.id, expirationDate);
    await setProposalStatus(proposal.id, ProposalStatus.Running);
    proposal.status = ProposalStatus.Running;
    await refreshProposalMessage(messageObject.client, proposal, true, true);
    scheduleProposal(messageObject.client, proposal, proposal.duration * 1000);
  }

  // CLEAR VOTE
  if (command.command == Command.ClearVote) {
    const proposal = await getProposal(command.id);
    if (proposal.server != messageObject.guild.id) {
      throw new OutOfBoundsError(
        'Proposals can only be used in their own guild'
      );
    }
    if (proposal.status != ProposalStatus.Running) {
      throw new StateError(
        "Cannot cancel a vote on a proposal that isn't running"
      );
    }
    await clearVote(proposal.id, messageObject.author.id);
    await refreshProposalMessage(messageObject.client, proposal, true, true);
  }

  // INSERT ACTION
  if (command.command == Command.InsertAction) {
    const proposal = await getProposal(command.id);
    if (proposal.server != messageObject.guild.id) {
      throw new OutOfBoundsError(
        'Proposals can only be used in their own guild'
      );
    }
    if (proposal.author != messageObject.author.id) {
      throw new AuthorizationError(
        'Only the proposal author can insert an action'
      );
    }
    if (proposal.status != ProposalStatus.Building) {
      throw new StateError(
        'Cannot add actions to an already running or closed proposal'
      );
    }
    // Validate action
    const actionValidation = await validateAction(
      messageObject.guild,
      command.action
    );
    if (!actionValidation.valid) {
      throw new ActionValidationFailureError(actionValidation);
    }
    const actions = await getActions(proposal.id);
    actions.splice(command.index, 0, command.action);
    const actionsValidation = await validateActions(
      messageObject.guild,
      actions
    );
    if (!actionsValidation.valid) {
      throw new ActionsValidationFailureError(actionsValidation);
    }
    // Insert action into DB
    await insertAction(proposal.id, command.index, command.actionString);
    // Update proposal view
    await refreshProposalMessage(messageObject.client, proposal, false, true);
  }

  // ADD ACTION
  if (command.command == Command.AddAction) {
    const proposal = await getProposal(command.id);
    if (proposal.server != messageObject.guild.id) {
      throw new OutOfBoundsError(
        'Proposals can only be used in their own guild'
      );
    }
    if (proposal.author != messageObject.author.id) {
      throw new AuthorizationError(
        'Only the proposal author can add an action'
      );
    }
    if (proposal.status != ProposalStatus.Building) {
      throw new StateError(
        'Cannot add actions to an already running or closed proposal'
      );
    }
    // Validate action
    const actionValidation = await validateAction(
      messageObject.guild,
      command.action
    );
    if (!actionValidation.valid) {
      throw new ActionValidationFailureError(actionValidation);
    }
    const actions = await getActions(proposal.id);
    const newIndex = await getNextIndex(proposal.id);
    actions[newIndex] = command.action;
    // Validate new list of actions
    const actionsValidation = await validateActions(
      messageObject.guild,
      actions
    );
    if (!actionsValidation.valid) {
      throw new ActionsValidationFailureError(actionsValidation);
    }
    // Create action in DB
    await createAction(proposal.id, newIndex, command.actionString);
    // Update proposal view
    await refreshProposalMessage(messageObject.client, proposal, false, true);
  }

  // REPLACE ACTION
  if (command.command == Command.ReplaceAction) {
    const proposal = await getProposal(command.id);
    if (proposal.server != messageObject.guild.id) {
      throw new OutOfBoundsError(
        'Proposals can only be used in their own guild'
      );
    }
    if (proposal.author != messageObject.author.id) {
      throw new AuthorizationError(
        'Only the proposal author can replace an action'
      );
    }
    if (proposal.status != ProposalStatus.Building) {
      throw new StateError(
        'Cannot add actions to an already running or closed proposal'
      );
    }
    // Validate new action
    const newActionValidation = await validateAction(
      messageObject.guild,
      command.action
    );
    if (!newActionValidation.valid) {
      throw new ActionValidationFailureError(newActionValidation);
    }
    const actions = await getActions(proposal.id);
    if (command.index >= actions.length) {
      throw new Error('Invalid index');
    }
    actions[command.index] = command.action;
    // Validate new list of actions
    const actionsValid = await validateActions(messageObject.guild, actions);
    if (!actionsValid.valid) {
      throw new ActionsValidationFailureError(actionsValid);
    }
    // Replace action in DB
    await replaceAction(proposal.id, command.index, command.actionString);
    // Update proposal view
    await refreshProposalMessage(messageObject.client, proposal, false, true);
  }

  // REMOVE ACTION
  if (command.command == Command.RemoveAction) {
    const proposal = await getProposal(command.id);
    if (proposal.server != messageObject.guild.id) {
      throw new OutOfBoundsError(
        'Proposals can only be used in their own guild'
      );
    }
    if (proposal.author != messageObject.author.id) {
      throw new AuthorizationError(
        'Only the proposal author can remove an action'
      );
    }
    if (proposal.status != ProposalStatus.Building) {
      throw new StateError(
        'Cannot add actions to an already running or closed proposal'
      );
    }
    // Validate new list of actions
    const actions = await getActions(proposal.id);
    if (command.index >= actions.length) {
      throw new CommandSyntaxError(`Index too large ${command.index}`);
    }
    actions.splice(command.index, 1);
    const actionsValidation = await validateActions(
      messageObject.guild,
      actions
    );
    if (!actionsValidation.valid) {
      throw new ActionsValidationFailureError(actionsValidation);
    }
    // Remove action from db
    await removeAction(proposal.id, command.index);
    // Update proposal view
    await refreshProposalMessage(messageObject.client, proposal, false, true);
  }

  // RESEND PROPOSAL
  if (command.command == Command.ResendProposal) {
  }

  // RETRY PROPOSAL
  if (command.command == Command.RetryProposal) {
    const proposal = await getProposal(command.id);
    if (proposal.server != messageObject.guild.id) {
      throw new OutOfBoundsError(
        'Proposals can only be used in their own guild'
      );
    }
    if (proposal.author != messageObject.author.id) {
      throw new AuthorizationError(
        'Only the proposal author can retry a proposal'
      );
    }
    if (proposal.status != ProposalStatus.ExecutionError) {
      throw new StateError(
        'Proposal must have failed to implement to start a retry'
      );
    }
    await handleProposalExpire(messageObject.client, proposal.id);
  }

  // HELP
  if (command.command == Command.Help) {
    if (!command.section.length) {
      await messageObject.channel.send(globalHelp);
      return;
    }
    switch (command.section) {
      case 'proposals':
        await messageObject.channel.send(proposalsHelp);
        break;
      case 'voting':
        await messageObject.channel.send(votingHelp);
        break;
      case 'actions':
        await messageObject.channel.send(actionsHelp);
        break;
      default:
        await messageObject.channel.send(`Unknown section ${command.section}`);
    }
  }
}
