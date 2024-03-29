<template>
  <v-main>
    <v-container fluid>
      <v-progress-linear
        :size="100"
        :value="timerValue"
        :color="timerColor"
        absolute
        top
      >
      </v-progress-linear>
      <v-row v-if="proposal">
        <v-col>
          <div class="text-h2 text-center">{{ proposal.name }}</div>
          <div class="text-subtitle-1 text-center">
            <span>{{ proposal.author.name }}</span>
            <span> • </span>
            <span>{{ durationFormat(Date.now() - proposal.createdOn) }} ago</span>
            <span> • </span>
            <span>{{ statusString }}</span>
          </div>
        </v-col>
      </v-row>
      <v-row 
        justify="center"
        v-if="proposal"
      >
        <v-col
          cols="6"
        >
          <div>{{ proposal.description }}</div>
        </v-col>
      </v-row>
      <v-row
        justify="center"
      >
        <v-hover
          v-slot="{ hover }"
        >
          <v-sheet
            :elevation="(hover || myVote === Vote.Yes) ? 12 : 2"
            height="100"
            width="100"
            color="success"
            class="mx-4"
            @click="submitVote(Vote.Yes)"
          >
            <div class="text-h2 text-center">{{ proposal.votes[Vote.Yes] }}</div>
          </v-sheet>
        </v-hover>
        <v-hover
          v-slot="{ hover }"
        >
          <v-sheet
            :elevation="(hover || myVote === Vote.Abstain) ? 12 : 2"
            height="100"
            width="100"
            color="white"
            class="mx-4"
            @click="submitVote(Vote.Abstain)"
          >
            <div class="text-h2 text-center">{{ proposal.votes[Vote.Abstain] }}</div>
          </v-sheet>
        </v-hover>
        <v-hover
          v-slot="{ hover }"
        >
          <v-sheet
            :elevation="(hover || myVote === Vote.No) ? 12 : 2"
            height="100"
            width="100"
            color="error"
            class="mx-4"
            @click="submitVote(Vote.No)"
          >
            <div class="text-h2 text-center">{{ proposal.votes[Vote.No] }}</div>
          </v-sheet>
        </v-hover>
      </v-row>
      <v-row justify="center">
        <v-col
          cols="6"
        >
        <action-list :actions="actions" />
        </v-col>
      </v-row>
    </v-container>
  </v-main>
</template>
<script lang="ts">
import Vue from "vue";
import { mapGetters } from "vuex";
import ActionList from "@/components/ActionList.vue";
import { getPermissionStringsFor } from "@/util/permissions";
import { Proposal, Vote, tResolvedAction, tAction, Action, ResolvedResourceReference, ProposalStatus } from "athena-common";
import { User } from "@/models/user";
import { getProposal, getMyVote, getActions, vote } from "@/services/proposals";
import { getMember } from "@/services/discord";
import durationFormat from "@/util/durationFormat";

export default Vue.extend({
  data() { return {
    proposal: <Proposal>null,
    author: <User>null,
    Vote,
    myVote: <Vote>null,
    actions: <Action[]>[]
  }; },
  props: [ 'proposalID', 'serverID' ],
  components: { ActionList },
  created() {
    // Fetch proposal
    this.fetchProposal();
    // Fetch actions
    this.fetchActions();
  },
  computed: {
    ...mapGetters('auth', ['token']),
    timerColor(): string {
      if (!this.proposal) return 'gray';
      if (this.proposal.status == ProposalStatus.Running) return 'blue';
      if (this.proposal.status == ProposalStatus.Passed) return 'success';
      if (this.proposal.status == ProposalStatus.Failed) return 'error';
      return 'gray';
    },
    timerValue(): number {
      if (!this.proposal) return 0;
      if (this.proposal.status == ProposalStatus.Running) {
        return 100 * ((this.proposal.expiresOn - Date.now()) / this.proposal.duration);
      }
      else if (this.proposal.status == ProposalStatus.Passed) return 100;
      else if (this.proposal.status == ProposalStatus.Failed) return 100;
      return 0;
    },
    statusString(): string {
      if (!this.proposal) return '';
      if (this.proposal.status == ProposalStatus.Running) {
        return `Running... ${this.durationFormat(this.proposal.expiresOn - Date.now())}`;
      }
      else if (this.proposal.status == ProposalStatus.Passed) {
        return 'Passed';
      }
      else if (this.proposal.status == ProposalStatus.Failed) {
        return 'Failed';
      }
      else if (this.proposal.status == ProposalStatus.ExecutionError) {
        return 'Execution Error';
      }
      return '';
    }
  },
  methods: {
    async submitVote(v: Vote | null) {
      if (!this.proposal) { return; }
      if (this.proposal.status != ProposalStatus.Running) { return; }
      if (v === this.myVote) { v = null; }
      this.proposal.votes = await vote(v, this.serverID, this.proposalID, this.token);
      this.myVote = v;
    },
    async fetchProposal() {
      if (!this.proposalID) { return; }
      this.proposal = await getProposal(this.serverID, this.proposalID, this.token);
    },
    async fetchActions() {
      if (!this.proposalID) { return; }
      this.actions = await getActions(this.serverID, this.proposalID, this.token);
    },
    durationFormat
  }
});
</script>

