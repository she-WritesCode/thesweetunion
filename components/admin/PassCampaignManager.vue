<template>
  <div class="space-y-4 text-slate-800">
    <!-- Master Channel Selector: Both vs WhatsApp vs Email -->
    <div
      class="p-2.5 bg-slate-100 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs"
    >
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-xs font-bold uppercase tracking-wider text-slate-600">Campaign Channel:</span>
        <div class="inline-flex rounded-md p-0.5 bg-white border border-slate-300 shadow-xs flex-wrap">
          <button
            type="button"
            @click="activeChannel = 'both'"
            class="px-3 py-1.5 text-xs font-medium rounded transition flex items-center gap-1.5"
            :class="
              activeChannel === 'both'
                ? 'bg-purple-900 text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            "
          >
            <span>Both (WhatsApp + Email)</span>
            <span
              class="text-[10px] px-1.5 py-0.2 rounded-full"
              :class="activeChannel === 'both' ? 'bg-purple-950 text-purple-200' : 'bg-slate-100 text-slate-600'"
            >
              Simultaneous
            </span>
          </button>
          <button
            type="button"
            @click="activeChannel = 'whatsapp'"
            class="px-3 py-1.5 text-xs font-medium rounded transition flex items-center gap-1.5"
            :class="
              activeChannel === 'whatsapp'
                ? 'bg-slate-900 text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            "
          >
            <span>WhatsApp Only</span>
            <span
              class="text-[10px] px-1.5 py-0.2 rounded-full"
              :class="activeChannel === 'whatsapp' ? 'bg-slate-800 text-emerald-300' : 'bg-slate-100 text-slate-600'"
            >
              {{ sentCount }} sent
            </span>
          </button>
          <button
            type="button"
            @click="activeChannel = 'email'"
            class="px-3 py-1.5 text-xs font-medium rounded transition flex items-center gap-1.5"
            :class="
              activeChannel === 'email'
                ? 'bg-indigo-700 text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            "
          >
            <span>Email Only</span>
            <span
              class="text-[10px] px-1.5 py-0.2 rounded-full"
              :class="activeChannel === 'email' ? 'bg-indigo-900 text-indigo-200' : 'bg-slate-100 text-slate-600'"
            >
              {{ emailSentCount }} / {{ guestsWithEmailCount }} sent
            </span>
          </button>
        </div>
      </div>

      <div class="text-xs text-slate-600 flex items-center gap-2">
        <template v-if="activeChannel === 'both'">
          <span class="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
          <span>Simultaneous dual dispatch: WhatsApp message + attached card AND complete email pass to inboxes.</span>
        </template>
        <template v-else-if="activeChannel === 'email'">
          <span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
          <span>Delivers official digital pass card &amp; full venue itinerary directly to guest inboxes.</span>
        </template>
        <template v-else>
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Automated WhatsApp messages dispatched via WAHA multi-sender sessions.</span>
        </template>
      </div>
    </div>

    <!-- Top Bar: Sender Segmented Controls + Actions (shown when in WhatsApp mode or general) -->
    <div
      v-if="activeChannel === 'whatsapp'"
      class="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3"
    >
      <!-- Senders Tabs -->
      <div class="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          @click="activeSenderTab = 'all'"
          class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
          :class="
            activeSenderTab === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          "
        >
          All Senders
          <span
            class="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full"
            :class="activeSenderTab === 'all' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'"
          >
            {{ totalGuests }}
          </span>
        </button>

        <button
          type="button"
          @click="activeSenderTab = 'unassigned'"
          class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5"
          :class="
            activeSenderTab === 'unassigned'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          "
        >
          <span>Unassigned</span>
          <span
            class="px-1.5 py-0.2 rounded-full text-[10px]"
            :class="activeSenderTab === 'unassigned' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'"
          >
            {{ unassignedPendingCount }}
          </span>
        </button>

        <button
          v-for="s in config.senders"
          :key="s.id"
          type="button"
          @click="activeSenderTab = s.id"
          class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5"
          :class="
            activeSenderTab === s.id
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          "
        >
          <!-- Session Status Indicator -->
          <span
            class="w-2 h-2 rounded-full shrink-0"
            :class="{
              'bg-emerald-500': s.status === 'WORKING',
              'bg-amber-400': s.status === 'SCAN_QR_CODE',
              'bg-rose-500': s.status === 'FAILED' || s.status === 'STOPPED',
              'bg-slate-300': !s.status || s.status === 'UNKNOWN',
            }"
            :title="`WAHA Session: ${s.wahaSession} (${s.status || 'Offline'})`"
          />
          <span>{{ s.name }}</span>
          <span
            class="px-1.5 py-0.2 rounded-full text-[10px]"
            :class="activeSenderTab === s.id ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'"
          >
            {{ senderPendingCount(s.id) }}
          </span>
        </button>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2">
        <span v-if="syncMessage" class="text-[11px] text-emerald-600 font-medium hidden sm:inline">
          {{ syncMessage }}
        </span>
        <span v-if="syncError" class="text-[11px] text-rose-600 font-medium">
          {{ syncError }}
        </span>

        <button
          type="button"
          @click="fetchData"
          :disabled="loading"
          class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-md bg-white hover:bg-slate-50 text-slate-700 transition disabled:opacity-50"
          title="Fetch latest phones and session statuses from WAHA"
        >
          <svg
            class="w-3.5 h-3.5 text-slate-500"
            :class="{ 'animate-spin': loading }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>Sync from WAHA</span>
        </button>

        <button
          type="button"
          @click="showSettings = !showSettings"
          class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-md bg-white hover:bg-slate-50 text-slate-700 transition"
        >
          <svg
            class="w-3.5 h-3.5 text-slate-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{{ showSettings ? "Hide Settings" : "Configure Routing & Message Template" }}</span>
        </button>
      </div>
    </div>

    <!-- Collapsible Settings Panel -->
    <div v-if="showSettings" class="p-4 border border-slate-200 bg-slate-50 rounded-lg space-y-4 shadow-xs">
      <!-- Settings Panel Header with Tab Switcher -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div class="flex items-center gap-3">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-700">Campaign Settings</h3>
          <div class="inline-flex rounded-md p-0.5 bg-slate-200/80">
            <button
              type="button"
              @click="settingsTab = 'template'"
              class="px-2.5 py-1 text-xs font-medium rounded transition inline-flex items-center gap-1.5"
              :class="
                settingsTab === 'template' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              "
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <span>Message Template & Pacing</span>
            </button>
            <button
              type="button"
              @click="settingsTab = 'routing'"
              class="px-2.5 py-1 text-xs font-medium rounded transition inline-flex items-center gap-1.5"
              :class="
                settingsTab === 'routing' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              "
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              <span>Routing & Senders</span>
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="saveSettings()"
            :disabled="savingSettings"
            class="px-3 py-1 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50 inline-flex items-center gap-1 shadow-xs transition"
          >
            <svg
              v-if="savingSettings"
              class="w-3 h-3 animate-spin text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <circle cx="12" cy="12" r="10" stroke-width="4" stroke="currentColor" class="opacity-25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" class="opacity-75" />
            </svg>
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      <!-- Tab 1: Message Template & Pacing -->
      <div v-if="settingsTab === 'template'" class="space-y-4">
        <div class="bg-white p-3.5 border border-slate-200 rounded-md space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label class="text-xs font-semibold text-slate-800 block">WhatsApp Invitation Message Template</label>
              <p class="text-[11px] text-slate-500">
                Click any tag below to insert it. The personalized Access Card image is attached when enabled below.
              </p>
            </div>
            <div class="flex items-center gap-3">
              <button
                type="button"
                @click="loadCorrectionTemplate"
                class="text-[11px] font-medium text-amber-700 hover:text-amber-800 underline self-start sm:self-auto"
                title="Load date clarification notice template for guests who received previous card"
              >
                Use Date Clarification Message
              </button>
              <button
                type="button"
                @click="resetTemplateToDefault"
                class="text-[11px] font-medium text-slate-500 hover:text-slate-800 underline self-start sm:self-auto"
              >
                Reset to Full Invitation
              </button>
            </div>
          </div>

          <!-- Clickable Placeholder Chips -->
          <div class="flex flex-wrap items-center gap-1.5 pt-1">
            <span class="text-[10px] uppercase font-semibold text-slate-400 mr-1">Insert Tag:</span>
            <button
              v-for="tag in templateTags"
              :key="tag.value"
              type="button"
              @click="insertTag(tag.value)"
              class="px-2 py-1 text-[11px] font-mono bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300 rounded transition inline-flex items-center gap-1"
              :title="tag.desc"
            >
              <svg
                class="w-2.5 h-2.5 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>{{ tag.value }}</span>
            </button>
          </div>

          <!-- Textarea Editor -->
          <div class="space-y-1">
            <textarea
              ref="templateTextarea"
              v-model="config.messageTemplate"
              rows="11"
              class="w-full p-3 font-mono text-xs border border-slate-200 rounded-md bg-white text-slate-900 focus:outline-none focus:border-slate-400 leading-relaxed"
              placeholder="Enter message template..."
            ></textarea>
          </div>

          <!-- Pacing Delay & Preview Controls -->
          <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div class="flex flex-wrap items-center gap-4">
              <div class="flex items-center gap-2">
                <label class="text-xs font-medium text-slate-700">Dispatch Delay (Pacing):</label>
                <select
                  v-model="config.paceSeconds"
                  class="px-2.5 py-1 text-xs border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:border-slate-400"
                >
                  <option :value="5">5 seconds (Fast)</option>
                  <option :value="8">8 seconds (Recommended)</option>
                  <option :value="10">10 seconds</option>
                  <option :value="15">15 seconds (Safe)</option>
                  <option :value="20">20 seconds (Extra Safe)</option>
                  <option :value="20">50 seconds (Extra Safe)</option>
                  <option :value="20">80 seconds (Extra Safe)</option>
                </select>
                <span class="text-[11px] text-slate-400 hidden md:inline"
                  >Spreads send volume to avoid WhatsApp anti-spam flags.</span
                >
              </div>

              <label class="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  v-model="config.attachImage"
                  class="rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                />
                <span>Attach VIP Access Card Image (.png)</span>
              </label>
            </div>

            <button
              type="button"
              @click="showPreview = !showPreview"
              class="px-2.5 py-1 text-xs font-medium border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded transition"
            >
              {{ showPreview ? "Hide Preview" : "Show Guest Preview" }}
            </button>
          </div>
        </div>

        <!-- Live Preview -->
        <div v-if="showPreview" class="p-3 bg-white border border-slate-200 rounded-md space-y-2">
          <div class="flex items-center justify-between text-[11px]">
            <span class="font-semibold uppercase tracking-wider text-slate-600">Sample Guest Preview</span>
            <span
              v-if="config.attachImage !== false"
              class="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-medium"
            >
              + VIP ACCESS CARD (PNG attached)
            </span>
            <span
              v-else
              class="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-medium"
            >
              Text Only (No image attached)
            </span>
          </div>
          <pre
            class="font-sans text-xs whitespace-pre-wrap text-slate-800 bg-slate-50/80 p-3 rounded border border-slate-200/80 leading-relaxed max-h-48 overflow-y-auto"
            >{{ previewRendered }}</pre
          >
        </div>
      </div>

      <!-- Tab 2: Routing & Senders -->
      <div v-if="settingsTab === 'routing'" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Live WAHA Senders -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-xs font-semibold text-slate-700">Dispatch Phones (WAHA)</label>
              <span class="text-[10px] text-slate-500 font-mono">{{ wahaSessions.length }} active session(s)</span>
            </div>

            <div class="space-y-2">
              <div
                v-for="s in config.senders"
                :key="s.id"
                class="p-2.5 bg-white border border-slate-200 rounded text-xs space-y-1.5"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1.5 font-medium text-slate-800">
                    <span
                      class="w-2 h-2 rounded-full shrink-0"
                      :class="{
                        'bg-emerald-500': s.status === 'WORKING',
                        'bg-amber-400': s.status === 'SCAN_QR_CODE',
                        'bg-rose-500': s.status === 'FAILED' || s.status === 'STOPPED',
                        'bg-slate-300': !s.status || s.status === 'UNKNOWN',
                      }"
                    />
                    <span>{{ s.name }}</span>
                  </div>
                  <div class="flex items-center gap-1.5 text-[10px]">
                    <span class="font-mono text-slate-400">{{ s.wahaSession }}</span>
                    <span
                      class="px-1.5 py-0.2 rounded font-medium"
                      :class="{
                        'bg-emerald-50 text-emerald-700 border border-emerald-200': s.status === 'WORKING',
                        'bg-amber-50 text-amber-700 border border-amber-200': s.status === 'SCAN_QR_CODE',
                        'bg-rose-50 text-rose-700 border border-rose-200':
                          s.status === 'FAILED' || s.status === 'STOPPED',
                        'bg-slate-100 text-slate-600': !s.status,
                      }"
                    >
                      {{ s.status || "DISCONNECTED" }}
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <span class="text-[11px] text-slate-500">Phone:</span>
                  <input
                    type="text"
                    v-model="s.phone"
                    placeholder="Awaiting QR Scan..."
                    class="flex-1 px-2 py-1 border border-slate-200 rounded text-xs text-slate-800 font-mono bg-slate-50/50 focus:border-slate-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- RSVP Group Mappings -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-xs font-semibold text-slate-700 block">Group Routing to Senders</label>
              <button
                type="button"
                @click="unassignAllGroups"
                class="text-[11px] text-rose-600 hover:text-rose-700 font-medium underline"
                title="Clear all sender assignments"
              >
                Unassign All Groups
              </button>
            </div>
            <div class="space-y-2 max-h-56 overflow-y-auto pr-1">
              <div
                v-for="grp in rsvpGroups"
                :key="grp.id"
                class="flex items-center justify-between p-2 bg-white border border-slate-200 rounded text-xs"
              >
                <div class="flex flex-col">
                  <span class="font-medium text-slate-800">{{ grp.name }}</span>
                  <span class="text-[10px] text-slate-400">{{ getGroupGuestCount(grp.id) }} confirmed guests</span>
                </div>
                <select
                  v-model="config.groupSenderMap[grp.id]"
                  class="px-2 py-1 border border-slate-200 rounded text-xs bg-white text-slate-800 focus:border-slate-400 focus:outline-none"
                >
                  <option value="">-- Unassigned --</option>
                  <option v-for="s in config.senders" :key="s.id" :value="s.id">
                    {{ s.name }} ({{ s.phone ? formatPhoneDisplay(s.phone) : s.wahaSession }})
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Bulk assign unsent guests -->
        <div class="p-3 bg-white border border-slate-200 rounded space-y-2.5">
          <div class="flex items-center justify-between">
            <label class="text-xs font-semibold text-slate-700">Assign Guests Who Haven't Received WhatsApp</label>
            <span class="text-[10px] text-slate-500">{{ bulkAssignTargets.length }} guest(s) will be assigned</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <label
              v-for="s in config.senders"
              :key="s.id"
              class="inline-flex items-center gap-1.5 px-2 py-1 border border-slate-200 rounded text-xs cursor-pointer"
              :class="bulkAssignSenderIds.includes(s.id) ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700'"
            >
              <input
                type="checkbox"
                class="hidden"
                :checked="bulkAssignSenderIds.includes(s.id)"
                @change="toggleBulkSender(s.id)"
              />
              <span>{{ s.name }}</span>
              <span class="text-[10px] opacity-70">({{ s.status || "DISCONNECTED" }})</span>
            </label>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <select
              v-model="bulkAssignScope"
              class="px-2 py-1 border border-slate-200 rounded text-xs bg-white text-slate-800"
            >
              <option value="all_unsent">All guests with no WhatsApp yet ({{ waPendingWithPhoneCount }})</option>
              <option value="email_sent_only">Only those who got email but no WhatsApp ({{ emailSentWaPendingCount }})</option>
            </select>
            <button
              type="button"
              @click="assignUnsentToSenders"
              :disabled="savingSettings"
              class="px-3 py-1.5 text-xs font-medium rounded bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50"
            >
              Assign evenly &amp; save
            </button>
            <button
              type="button"
              @click="assignAndStartSending"
              :disabled="savingSettings || isDispatching"
              class="px-3 py-1.5 text-xs font-medium rounded bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              Assign &amp; start sending
            </button>
          </div>
          <div v-if="noPhoneUnsentGuests.length" class="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
            <strong>{{ noPhoneUnsentGuests.length }} guest(s) have no phone number</strong> and can't get WhatsApp:
            {{ noPhoneUnsentGuests.map((g) => g.leadName).join(", ") }}
          </div>
          <p class="text-[10px] text-slate-500">
            Overrides any previous guest-level assignment (including My Phone). Guests already sent via WhatsApp are untouched.
          </p>
        </div>

        <!-- Test Send Bar -->
        <div class="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-3">
            <!-- WhatsApp Test -->
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-xs font-medium text-slate-700">Test WA:</span>
              <select
                v-model="testSenderSession"
                class="px-2 py-1 text-xs border border-slate-200 rounded bg-white text-slate-800 focus:border-slate-400 focus:outline-none"
                title="Select which WhatsApp session sends the test message"
              >
                <option v-for="s in config.senders" :key="s.id" :value="s.wahaSession">
                  From: {{ s.name }} ({{ s.wahaSession }})
                </option>
              </select>
              <input
                type="text"
                v-model="testPhone"
                placeholder="Phone (e.g. 2348105733592)"
                class="px-2.5 py-1 text-xs border border-slate-200 rounded font-mono bg-white text-slate-800 w-44 focus:border-slate-400 focus:outline-none"
              />
              <button
                type="button"
                @click="sendTestPass"
                :disabled="testing || !testPhone"
                class="px-2.5 py-1 text-xs font-medium bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <svg
                  v-if="testing"
                  class="w-3 h-3 animate-spin text-slate-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <circle cx="12" cy="12" r="10" stroke-width="4" stroke="currentColor" class="opacity-25" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" class="opacity-75" />
                </svg>
                <span>Send Test WA</span>
              </button>
            </div>

            <!-- Email Test -->
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-xs font-medium text-slate-700">Test Email:</span>
              <input
                type="email"
                v-model="testEmail"
                placeholder="e.g. you@example.com"
                class="px-2.5 py-1 text-xs border border-slate-200 rounded font-mono bg-white text-slate-800 w-48 focus:border-slate-400 focus:outline-none"
              />
              <button
                type="button"
                @click="sendTestEmail"
                :disabled="testingEmail || !testEmail"
                class="px-2.5 py-1 text-xs font-medium bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 inline-flex items-center gap-1.5 rounded transition"
              >
                <svg
                  v-if="testingEmail"
                  class="w-3 h-3 animate-spin text-indigo-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <circle cx="12" cy="12" r="10" stroke-width="4" stroke="currentColor" class="opacity-25" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" class="opacity-75" />
                </svg>
                <span>Send Test Email</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Dedicated Dispatch Mode Bar: WhatsApp Full vs Clarification OR Email Mode -->
    <div
      class="p-3 text-white rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm border"
      :class="activeChannel === 'email' ? 'bg-indigo-950 border-indigo-900' : 'bg-slate-900 border-slate-800'"
    >
      <div v-if="activeChannel === 'email'" class="flex items-center gap-2.5 flex-wrap">
        <span class="text-xs font-bold uppercase tracking-wider text-indigo-300">Campaign Mode:</span>
        <span class="px-3 py-1.5 text-xs font-semibold rounded bg-indigo-700 text-white shadow-xs inline-flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
          <span>Official Pass Card &amp; Venue Itinerary Email</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-900 text-indigo-200">
            Pending: {{ emailPendingCount }}
          </span>
        </span>
      </div>

      <div v-else class="flex items-center gap-2.5 flex-wrap">
        <span class="text-xs font-bold uppercase tracking-wider text-slate-300">Campaign Mode:</span>
        <div class="inline-flex rounded-md p-0.5 bg-slate-950 border border-slate-700">
          <button
            type="button"
            @click="setCampaignMode('pass')"
            class="px-3 py-1.5 text-xs font-medium rounded transition flex items-center gap-1.5"
            :class="
              campaignMode === 'pass'
                ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                : 'text-slate-300 hover:text-white'
            "
          >
            <span>Full Pass Invitations</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900 text-emerald-200">
              Fresh Guests ({{ neverSentCount }})
            </span>
          </button>
          <button
            type="button"
            @click="setCampaignMode('clarification')"
            class="px-3 py-1.5 text-xs font-medium rounded transition flex items-center gap-1.5"
            :class="
              campaignMode === 'clarification'
                ? 'bg-amber-600 text-white shadow-xs font-semibold'
                : 'text-slate-300 hover:text-white'
            "
          >
            <span>Date Clarification Notice</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900 text-amber-200">
              Sent Yesterday ({{ previouslySentCount }})
            </span>
          </button>
        </div>
      </div>

      <!-- Mode Explanation -->
      <div class="text-xs flex items-center gap-2" :class="activeChannel === 'email' ? 'text-indigo-200' : 'text-slate-300'">
        <template v-if="activeChannel === 'email'">
          <span class="inline-block w-2 h-2 rounded-full bg-indigo-400"></span>
          <span>Delivered directly from TheSweetUnion via Gmail SMTP with attached VIP access card.</span>
        </template>
        <template v-else-if="campaignMode === 'clarification'">
          <span class="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span>Short text note (Nov 21, 2026 clarification · text only). Targets earlier batch.</span>
        </template>
        <template v-else>
          <span class="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Full pass invitation + attached VIP Access Card image.</span>
        </template>
      </div>
    </div>

    <!-- Execution Bar / Progress Stats -->
    <div
      class="p-3 border rounded-lg bg-white flex flex-col md:flex-row md:items-center justify-between gap-3"
      :class="activeChannel === 'email' ? 'border-indigo-200' : 'border-slate-200'"
    >
      <div class="space-y-1 flex-1">
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-2 flex-wrap">
            <template v-if="activeChannel === 'email'">
              <span class="font-semibold text-slate-900">
                {{ emailSentCount }} / {{ guestsWithEmailCount }} emails delivered
              </span>
              <span class="text-slate-400">·</span>
              <span class="text-indigo-700 font-semibold">{{ emailProgressPercent }}% completed</span>
              <span class="text-slate-400">·</span>
              <span class="text-slate-600">{{ emailPendingCount }} pending</span>
            </template>
            <template v-else>
              <span class="font-semibold text-slate-900"> {{ sentCount }} / {{ totalGuests }} passes dispatched </span>
              <span class="text-slate-400">·</span>
              <span class="text-slate-600">{{ progressPercent }}% completed</span>
              <template v-if="sentCount > 0 && !isDispatching">
                <span class="text-slate-400">·</span>
                <button
                  type="button"
                  @click="confirmResetCampaign"
                  :disabled="resetting"
                  class="text-[11px] text-amber-700 hover:text-amber-800 font-medium underline inline-flex items-center gap-1"
                  title="Mark all sent passes as pending to re-send without wiping historical timestamps"
                >
                  <svg
                    v-if="resetting"
                    class="w-3 h-3 animate-spin text-amber-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <circle cx="12" cy="12" r="10" stroke-width="4" stroke="currentColor" class="opacity-25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" class="opacity-75" />
                  </svg>
                  <span>Reset for Re-send (Keep History)</span>
                </button>
              </template>
            </template>
          </div>
          <span class="text-[11px] text-slate-500 font-mono">
            Active view: {{ activeSenderLabel }} ({{ filteredGuests.length }} guests)
          </span>
        </div>
        <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            class="h-2 rounded-full transition-all duration-300"
            :class="activeChannel === 'email' ? 'bg-indigo-600' : 'bg-slate-900'"
            :style="{ width: `${activeChannel === 'email' ? emailProgressPercent : progressPercent}%` }"
          ></div>
        </div>
      </div>

      <!-- Auto-dispatch Controls -->
      <div class="flex flex-wrap items-center gap-2">
        <div v-if="!isDispatching" class="flex items-center gap-1.5">
          <label class="text-[11px] font-medium text-slate-600 hidden sm:inline">Pacing:</label>
          <template v-if="activeChannel === 'email'">
            <select
              v-model="emailPaceSeconds"
              class="px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:border-slate-400 font-medium"
              title="Delay between emails to prevent SMTP throttling"
            >
              <option :value="1.5">1.5s per email (~10 mins)</option>
              <option :value="2">2s per email (Recommended)</option>
              <option :value="3">3s per email (Gentle)</option>
            </select>
          </template>
          <template v-else>
            <select
              v-model="dispatchStrategy"
              class="px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:border-slate-400 font-medium"
              title="Choose how the sending queue is paced across phones"
            >
              <option value="interleaved">Interleaved Pacing (1 Groom -> 1 Bride -> 1 My Phone)</option>
              <option value="sequential">Sequential (Group by Group)</option>
            </select>
          </template>
        </div>

        <template v-if="!isDispatching">
          <!-- Both Auto-Send -->
          <button
            v-if="activeChannel === 'both'"
            type="button"
            @click="startBothAutoDispatch"
            :disabled="pendingBothInView.length === 0"
            class="px-3.5 py-1.5 text-xs font-medium rounded-md text-white shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5 transition bg-purple-900 hover:bg-purple-950 font-semibold"
          >
            <svg class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span>Start Auto-Send Both (WA + Email) ({{ pendingBothInView.length }})</span>
          </button>

          <!-- WhatsApp Auto-Send -->
          <button
            v-else-if="activeChannel === 'whatsapp'"
            type="button"
            @click="startAutoDispatch"
            :disabled="pendingGuestsInView.length === 0"
            class="px-3.5 py-1.5 text-xs font-medium rounded-md text-white shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5 transition"
            :class="
              campaignMode === 'clarification'
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-emerald-700 hover:bg-emerald-800'
            "
          >
            <svg class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span v-if="campaignMode === 'clarification'"
              >Send Date Clarification ({{ pendingGuestsInView.length }})</span
            >
            <span v-else>Start Auto-Send WA ({{ pendingGuestsInView.length }})</span>
          </button>

          <!-- Email Auto-Send -->
          <button
            v-else
            type="button"
            @click="startEmailAutoDispatch"
            :disabled="pendingEmailsInView.length === 0"
            class="px-3.5 py-1.5 text-xs font-medium rounded-md text-white shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5 transition bg-indigo-700 hover:bg-indigo-800"
          >
            <svg class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <span>Start Auto-Send Emails ({{ pendingEmailsInView.length }})</span>
          </button>
        </template>
        <template v-else>
          <div
            v-if="currentSenderNotice"
            class="text-xs px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5"
            :class="
              activeChannel === 'both'
                ? 'text-purple-900 bg-purple-50 border border-purple-200'
                : activeChannel === 'email'
                ? 'text-indigo-800 bg-indigo-50 border border-indigo-200'
                : 'text-emerald-800 bg-emerald-50 border border-emerald-200'
            "
          >
            <span
              class="w-2 h-2 rounded-full animate-pulse"
              :class="
                activeChannel === 'both'
                  ? 'bg-purple-600'
                  : activeChannel === 'email'
                  ? 'bg-indigo-500'
                  : 'bg-emerald-500'
              "
            ></span>
            <span>Sending: {{ currentSenderNotice }}</span>
          </div>
          <button
            type="button"
            @click="pauseAutoDispatch"
            class="px-3 py-1.5 text-xs font-medium rounded-md bg-amber-600 hover:bg-amber-700 text-white inline-flex items-center gap-1.5"
          >
            <svg class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
            <span>{{ isPaused ? "Resume" : "Pause" }}</span>
          </button>
          <button
            type="button"
            @click="stopAutoDispatch"
            class="px-3 py-1.5 text-xs font-medium rounded-md bg-rose-600 hover:bg-rose-700 text-white inline-flex items-center gap-1.5"
          >
            <svg class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="4" y="4" width="16" height="16" />
            </svg>
            <span>Stop</span>
          </button>
        </template>
      </div>
    </div>

    <!-- Table Search & Filter Bar -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-2">
      <div class="relative w-full sm:w-72">
        <svg
          class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Filter by name, pass code, or phone..."
          class="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400"
        />
      </div>

      <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
        <select
          v-model="statusFilter"
          class="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:border-slate-400 font-medium"
        >
          <template v-if="activeChannel === 'both'">
            <option value="all">All Guests ({{ totalGuests }})</option>
            <option value="both_pending">Both or Either Pending ({{ bothPendingCount }})</option>
            <option value="email_sent_wa_pending">Email Sent, WhatsApp Pending ({{ emailSentWaPendingCount }})</option>
            <option value="both_sent">Both WA & Email Sent ({{ bothSentCount }})</option>
            <option value="previously_sent">Sent Yesterday (Needs Date Clarification) ({{ previouslySentCount }})</option>
            <option value="never_sent">Never Sent WA (Fresh Pending) ({{ neverSentCount }})</option>
          </template>
          <template v-else-if="activeChannel === 'email'">
            <option value="all">All Guests ({{ totalGuests }})</option>
            <option value="email_pending">Email Pending ({{ emailRemainingCount }})</option>
            <option value="email_sent">Email Sent ({{ emailSentCount }})</option>
          </template>
          <template v-else>
            <option value="all">All Guests ({{ totalGuests }})</option>
            <option value="previously_sent">Sent Yesterday (Needs Date Clarification) ({{ previouslySentCount }})</option>
            <option value="never_sent">Never Sent (Fresh Pass Pending) ({{ neverSentCount }})</option>
            <option value="sent_today">Sent Today After Fix (Correct Card) ({{ sentThisAfternoonCount }})</option>
            <option value="pending">All Pending ({{ pendingTotalCount }})</option>
            <option value="email_sent_wa_pending">Email Sent, WhatsApp Pending ({{ emailSentWaPendingCount }})</option>
            <option value="wa_pending_with_phone">WhatsApp Pending, Has Phone ({{ waPendingWithPhoneCount }})</option>
            <option value="sent">All Marked Sent ({{ sentCount }})</option>
          </template>
        </select>
        <span class="text-xs text-slate-500">{{ displayedGuests.length }} of {{ filteredGuests.length }}</span>
      </div>
    </div>

    <!-- Guests Table -->
    <div class="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
            <!-- Table Headers based on Active Channel -->
            <tr v-if="activeChannel === 'both'">
              <th class="px-3.5 py-2.5">Guest</th>
              <th class="px-3.5 py-2.5">Pass Code</th>
              <th class="px-3.5 py-2.5">Contacts (WA & Email)</th>
              <th class="px-3.5 py-2.5">Assigned Phone</th>
              <th class="px-3.5 py-2.5">WhatsApp Status</th>
              <th class="px-3.5 py-2.5">Email Status</th>
              <th class="px-3.5 py-2.5 text-right">Actions</th>
            </tr>
            <tr v-else-if="activeChannel === 'email'">
              <th class="px-3.5 py-2.5">Guest</th>
              <th class="px-3.5 py-2.5">Pass Code</th>
              <th class="px-3.5 py-2.5">Email Address</th>
              <th class="px-3.5 py-2.5">Group</th>
              <th class="px-3.5 py-2.5">Email Status</th>
              <th class="px-3.5 py-2.5 text-right">Actions</th>
            </tr>
            <tr v-else>
              <th class="px-3.5 py-2.5">Guest</th>
              <th class="px-3.5 py-2.5">Pass Code</th>
              <th class="px-3.5 py-2.5">Phone Number</th>
              <th class="px-3.5 py-2.5">Group</th>
              <th class="px-3.5 py-2.5">Assigned Sender</th>
              <th class="px-3.5 py-2.5">Delivery Status</th>
              <th class="px-3.5 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="displayedGuests.length === 0">
              <td colspan="7" class="px-4 py-8 text-center text-slate-400">
                No confirmed guests found matching criteria.
              </td>
            </tr>
            <tr
              v-for="guest in displayedGuests"
              :key="guest.id"
              class="hover:bg-slate-50/75 transition-colors"
              :class="{ 'bg-emerald-50/30': currentProcessingId === guest.id }"
            >
              <!-- Guest Name -->
              <td class="px-3.5 py-2.5 font-medium text-slate-900">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span>{{ guest.leadName }}</span>
                  <span
                    v-if="guest.hasSpouse && guest.spouseName"
                    class="text-[10px] px-1 py-0.2 bg-slate-100 text-slate-600 rounded font-normal"
                  >
                    + {{ guest.spouseName }}
                  </span>
                  <span
                    v-if="guest.asoebiSent"
                    class="text-[10px] px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200/60 rounded font-medium inline-flex items-center gap-1"
                    title="Sent Asoebi message"
                  >
                    <span>Asoebi</span>
                  </span>
                </div>
              </td>

              <!-- Pass Code -->
              <td class="px-3.5 py-2.5 font-mono font-semibold text-slate-800">
                <a
                  :href="`https://thesweetunion.vercel.app/pass/${guest.passCode || guest.id}`"
                  target="_blank"
                  rel="noopener"
                  class="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[11px] border border-slate-200/60 inline-flex items-center gap-1 text-slate-800 hover:text-slate-950 transition"
                  title="View online pass"
                >
                  <span>{{ guest.passCode || "—" }}</span>
                  <svg class="w-2.5 h-2.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </td>

              <!-- CHANNEL MODE: BOTH -->
              <template v-if="activeChannel === 'both'">
                <!-- Contacts (WA & Email) -->
                <td class="px-3.5 py-2.5 text-slate-600">
                  <div class="space-y-0.5 font-mono text-[11px]">
                    <div class="flex items-center gap-1 text-slate-700">
                      <span class="text-[9px] font-sans px-1 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded font-semibold">WA</span>
                      <span>{{ formatPhoneDisplay(guest.leadPhone) }}</span>
                    </div>
                    <div class="flex items-center gap-1 text-slate-500 font-sans truncate max-w-[200px]" :title="guest.leadEmail">
                      <span class="text-[9px] px-1 py-0.2 bg-indigo-50 text-indigo-700 border border-indigo-200/60 rounded font-semibold">EMAIL</span>
                      <span class="truncate">{{ guest.leadEmail || "—" }}</span>
                    </div>
                  </div>
                </td>

                <!-- Assigned Sender -->
                <td class="px-3.5 py-2.5">
                  <span
                    v-if="guest.invitationSent && guest.invitationSentVia"
                    class="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded"
                  >
                    <span>{{ formatSentVia(guest.invitationSentVia) }}</span>
                  </span>
                  <span
                    v-else-if="resolveSenderForGuest(guest) !== 'unassigned'"
                    class="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700"
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full shrink-0"
                      :class="{
                        'bg-emerald-500': getSenderStatus(resolveSenderForGuest(guest)) === 'WORKING',
                        'bg-amber-400': getSenderStatus(resolveSenderForGuest(guest)) === 'SCAN_QR_CODE',
                        'bg-rose-500': getSenderStatus(resolveSenderForGuest(guest)) === 'FAILED',
                        'bg-slate-300': !getSenderStatus(resolveSenderForGuest(guest)),
                      }"
                    />
                    <span>{{ getSenderName(resolveSenderForGuest(guest)) }}</span>
                  </span>
                  <span v-else class="text-[11px] text-slate-400 italic"> Unassigned </span>
                </td>

                <!-- WhatsApp Status -->
                <td class="px-3.5 py-2.5">
                  <span
                    v-if="isSentThisAfternoon(guest)"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                  >
                    <svg class="w-3 h-3 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Sent</span>
                  </span>
                  <span
                    v-else-if="needsDateClarification(guest)"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-300"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span>Sent (Old Date)</span>
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    <span>Pending</span>
                  </span>
                </td>

                <!-- Email Status -->
                <td class="px-3.5 py-2.5">
                  <span
                    v-if="guest.emailSent"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200"
                  >
                    <svg class="w-3 h-3 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Delivered</span>
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    <span>Pending</span>
                  </span>
                </td>

                <!-- Actions (Both Mode) -->
                <td class="px-3.5 py-2.5 text-right space-x-1.5 whitespace-nowrap">
                  <!-- Primary: Send Both -->
                  <button
                    type="button"
                    @click="sendBothToGuest(guest)"
                    :disabled="sendingBothId === guest.id || emailingId === guest.id || sendingId === guest.id || isDispatching"
                    class="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-purple-900 text-white rounded hover:bg-purple-950 disabled:opacity-50 transition shadow-xs"
                    title="Send both WhatsApp and Email simultaneously"
                  >
                    <svg v-if="sendingBothId === guest.id" class="w-3 h-3 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" stroke-width="4" stroke="currentColor" class="opacity-25" />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" class="opacity-75" />
                    </svg>
                    <span>{{ guest.invitationSent && guest.emailSent ? "Resend Both" : "Send Both" }}</span>
                  </button>

                  <!-- WA Only -->
                  <button
                    type="button"
                    @click="sendSinglePass(guest)"
                    :disabled="sendingId === guest.id || sendingBothId === guest.id || isDispatching"
                    class="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium border border-slate-200 rounded hover:bg-slate-50 text-slate-700 transition disabled:opacity-50"
                    title="Send WhatsApp only"
                  >
                    <svg v-if="sendingId === guest.id" class="w-3 h-3 animate-spin text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" stroke-width="4" stroke="currentColor" class="opacity-25" />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" class="opacity-75" />
                    </svg>
                    <span>WA</span>
                  </button>

                  <!-- Email Only -->
                  <button
                    type="button"
                    @click="sendSingleEmail(guest)"
                    :disabled="emailingId === guest.id || sendingBothId === guest.id || isDispatching"
                    class="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium border border-slate-200 rounded hover:bg-slate-50 text-slate-700 transition disabled:opacity-50"
                    title="Send Email only"
                  >
                    <svg v-if="emailingId === guest.id" class="w-3 h-3 animate-spin text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" stroke-width="4" stroke="currentColor" class="opacity-25" />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" class="opacity-75" />
                    </svg>
                    <span>Email</span>
                  </button>

                  <!-- Direct WA link -->
                  <a
                    :href="buildWaLink(guest)"
                    target="_blank"
                    rel="noopener"
                    class="inline-flex items-center p-1 text-[11px] border border-slate-200 rounded hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition"
                    title="Open direct WhatsApp conversation"
                  >
                    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </td>
              </template>

              <!-- CHANNEL MODE: EMAIL -->
              <template v-else-if="activeChannel === 'email'">
                <!-- Email Address -->
                <td class="px-3.5 py-2.5 font-mono text-slate-600">
                  <span :title="guest.leadEmail">{{ guest.leadEmail || "—" }}</span>
                </td>

                <!-- Group -->
                <td class="px-3.5 py-2.5 text-slate-600">
                  {{ getGroupName(guest.group) }}
                </td>

                <!-- Email Status -->
                <td class="px-3.5 py-2.5">
                  <span
                    v-if="guest.emailSent"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                  >
                    <svg class="w-3 h-3 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Delivered</span>
                    <span v-if="guest.emailSentAt" class="text-emerald-500 font-mono">
                      ({{ formatDate(guest.emailSentAt) }})
                    </span>
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    <span>Pending</span>
                  </span>
                </td>

                <!-- Actions (Email Mode) -->
                <td class="px-3.5 py-2.5 text-right space-x-1.5 whitespace-nowrap">
                  <button
                    type="button"
                    @click="sendSingleEmail(guest)"
                    :disabled="emailingId === guest.id || isDispatching"
                    class="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-indigo-700 text-white rounded hover:bg-indigo-800 disabled:opacity-50 transition"
                  >
                    <svg v-if="emailingId === guest.id" class="w-3 h-3 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" stroke-width="4" stroke="currentColor" class="opacity-25" />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" class="opacity-75" />
                    </svg>
                    <span>{{ guest.emailSent ? "Resend Email" : "Send Email Pass" }}</span>
                  </button>
                </td>
              </template>

              <!-- CHANNEL MODE: WHATSAPP -->
              <template v-else>
                <!-- Phone -->
                <td class="px-3.5 py-2.5 font-mono text-slate-600">
                  {{ formatPhoneDisplay(guest.leadPhone) }}
                </td>

                <!-- Group -->
                <td class="px-3.5 py-2.5 text-slate-600">
                  {{ getGroupName(guest.group) }}
                </td>

                <!-- Assigned Sender -->
                <td class="px-3.5 py-2.5">
                  <span
                    v-if="guest.invitationSent && guest.invitationSentVia"
                    class="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded"
                  >
                    <span>{{ formatSentVia(guest.invitationSentVia) }}</span>
                  </span>
                  <span
                    v-else-if="resolveSenderForGuest(guest) !== 'unassigned'"
                    class="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700"
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full shrink-0"
                      :class="{
                        'bg-emerald-500': getSenderStatus(resolveSenderForGuest(guest)) === 'WORKING',
                        'bg-amber-400': getSenderStatus(resolveSenderForGuest(guest)) === 'SCAN_QR_CODE',
                        'bg-rose-500': getSenderStatus(resolveSenderForGuest(guest)) === 'FAILED',
                        'bg-slate-300': !getSenderStatus(resolveSenderForGuest(guest)),
                      }"
                    />
                    <span>{{ getSenderName(resolveSenderForGuest(guest)) }}</span>
                  </span>
                  <span v-else class="text-[11px] text-slate-400 italic"> Unassigned </span>
                </td>

                <!-- Status -->
                <td class="px-3.5 py-2.5">
                  <span
                    v-if="isSentThisAfternoon(guest)"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                    title="Sent this afternoon with the correct Nov 21 date. Does NOT need clarification."
                  >
                    <svg
                      class="w-3 h-3 text-emerald-600"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Sent (Correct Card)</span>
                    <span v-if="guest.invitationSentAt" class="text-emerald-500 font-mono">
                      ({{ formatDate(guest.invitationSentAt) }})
                    </span>
                  </span>
                  <span
                    v-else-if="needsDateClarification(guest)"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-300"
                    :title="'Sent yesterday with previous date card. Needs quick date clarification note.'"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span>Sent Yesterday (Needs Clarification)</span>
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    <span>Pending (Never Sent)</span>
                  </span>
                </td>

                <!-- Actions -->
                <td class="px-3.5 py-2.5 text-right space-x-1.5 whitespace-nowrap">
                  <!-- Direct WhatsApp Click-to-Send Link -->
                  <a
                    :href="buildWaLink(guest)"
                    target="_blank"
                    rel="noopener"
                    class="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium border border-slate-200 rounded hover:bg-slate-50 text-slate-700 transition"
                    title="Open direct WhatsApp conversation"
                  >
                    <span>Open WhatsApp</span>
                    <svg
                      class="w-3 h-3 text-slate-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>

                  <!-- Automated Send via WAHA -->
                  <button
                    type="button"
                    @click="sendSinglePass(guest)"
                    :disabled="sendingId === guest.id || isDispatching"
                    class="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50 transition"
                  >
                    <svg
                      v-if="sendingId === guest.id"
                      class="w-3 h-3 animate-spin text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <circle cx="12" cy="12" r="10" stroke-width="4" stroke="currentColor" class="opacity-25" />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" class="opacity-75" />
                    </svg>
                    <span>{{ guest.invitationSent ? "Resend" : "Send Pass" }}</span>
                  </button>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        class="px-3.5 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600"
      >
        <div>Showing {{ paginationStart }} - {{ paginationEnd }} of {{ filteredGuests.length }} guests</div>
        <div class="flex items-center gap-1">
          <button
            type="button"
            @click="currentPage--"
            :disabled="currentPage <= 1"
            class="px-2 py-1 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-40"
          >
            Previous
          </button>
          <span class="px-2 font-mono text-[11px]">Page {{ currentPage }} of {{ totalPages || 1 }}</span>
          <button
            type="button"
            @click="currentPage++"
            :disabled="currentPage >= totalPages"
            class="px-2 py-1 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { adminAuthHeaders } from "~/utils/admin-auth";

interface WahaSessionInfo {
  name: string;
  status: string;
  phone: string | null;
  pushName?: string;
}

interface SenderConfig {
  id: string;
  name: string;
  phone: string;
  wahaSession: string;
  status?: string;
}

interface CampaignSettings {
  senders: SenderConfig[];
  groupSenderMap: Record<string, string>;
  guestSenderMap?: Record<string, string>;
  paceSeconds: number;
  messageTemplate: string;
  attachImage?: boolean;
}

interface RSVPGroup {
  id: string;
  name: string;
  guestCount?: number;
}

interface GuestRecord {
  id: string;
  leadName: string;
  leadEmail?: string;
  leadPhone?: string;
  hasSpouse?: boolean;
  spouseName?: string;
  passCode?: string;
  group?: any;
  asoebiSent?: boolean;
  wantsAsoebi?: boolean;
  attending?: boolean;
  invitationSent?: boolean;
  invitationSentAt?: string;
  invitationSentVia?: string;
  emailSent?: boolean;
  emailSentAt?: string;
  previousInvitationSentAt?: string;
  previousInvitationSentVia?: string;
}

const activeChannel = ref<"both" | "whatsapp" | "email">("both");
const testEmail = ref("busolaokemoney@gmail.com");
const testingEmail = ref(false);
const emailingId = ref<string | null>(null);
const sendingBothId = ref<string | null>(null);
const emailPaceSeconds = ref(2);

const loading = ref(false);
const savingSettings = ref(false);
const testing = ref(false);
const showSettings = ref(false);
const settingsTab = ref<"template" | "routing">("template");
const showPreview = ref(true);
const templateTextarea = ref<HTMLTextAreaElement | null>(null);

const DEFAULT_MESSAGE_TEMPLATE = `[Greeting, e.g. Dear [Guest Name]

We can't wait to celebrate with you at #TheSweetUnion! 💍✨

Your Reception Access Card is ready. Kindly save the image attached to this message and this pass code to show at the reception:
Pass Code: *[PASS_CODE]*.


*Venue Details*
CHURCH CEREMONY: 
Saturday, Nov 21, 2026 @ 09:00 AM
RCCG Victory Center, No 58 Iju Road, Agege, Lagos
(Open to all friends & family)

RECEPTION: 
Saturday, Nov 21, 2026 @ 01:00 PM 
*Ronnie Dee Event Centre, 67 Iju Rd, Pen Cinema Zone, beside Eterna Petrol Station, Agege, Lagos 101232, Lagos*
(Strictly by digital access card or pass code)


DRESS CODE: Mauve & Gold
GIFTS & REGISTRY: https://thesweetunion.vercel.app/wishlist

Want to read about our love story? Check here: https://thesweetunion.vercel.app/

With love,
Adun & Uche`;

const CORRECTION_MESSAGE_TEMPLATE = `Please note a quick clarification regarding your wedding access card:

Kindly disregard the date printed on the access card image sent earlier. Our wedding celebration is on: Saturday, November 21, 2026

Thanks.`;

const campaignMode = ref<"pass" | "clarification">("pass");

function setCampaignMode(mode: "pass" | "clarification") {
  campaignMode.value = mode;
  if (mode === "clarification") {
    config.value.messageTemplate = CORRECTION_MESSAGE_TEMPLATE;
    config.value.attachImage = false;
    statusFilter.value = "previously_sent";
  } else {
    config.value.messageTemplate = DEFAULT_MESSAGE_TEMPLATE;
    config.value.attachImage = true;
    statusFilter.value = "never_sent";
  }
}

function loadCorrectionTemplate() {
  setCampaignMode("clarification");
}

function resetTemplateToDefault() {
  if (confirm("Reset WhatsApp message template back to the standard pass invitation default?")) {
    setCampaignMode("pass");
  }
}

const templateTags = [
  { value: "[Greeting, e.g. Dear [Guest Name] / Hi [Guest Name]!]", desc: "Personalized greeting" },
  { value: "[Guest Name]", desc: "Lead guest name (+ spouse if attending)" },
  { value: "[PASS_CODE]", desc: "6-character unique access code" },
  { value: "[PASS_URL]", desc: "Link to digital VIP access card & itinerary" },
  { value: "[Church Venue & Time]", desc: "Church ceremony details" },
  { value: "[Reception Venue & Time]", desc: "Reception entry details" },
  { value: "[Details...]", desc: "Colors & dress code instructions" },
  { value: "[Wishlist Link...]", desc: "Link to wedding gift registry" },
];

function insertTag(tag: string) {
  const el = templateTextarea.value;
  const current = config.value.messageTemplate || DEFAULT_MESSAGE_TEMPLATE;
  if (!el) {
    config.value.messageTemplate = current + (current ? " " : "") + tag;
    return;
  }
  const start = el.selectionStart ?? current.length;
  const end = el.selectionEnd ?? current.length;
  config.value.messageTemplate = current.substring(0, start) + tag + current.substring(end);
  setTimeout(() => {
    el.focus();
    el.setSelectionRange(start + tag.length, start + tag.length);
  }, 0);
}

function getCampaignBaseUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = window.location.origin;
    if (!origin.includes("thesweetunion.com") && !origin.includes("localhost")) {
      return origin;
    }
  }
  return "https://thesweetunion.vercel.app";
}

function renderTemplateForGuest(template: string, guest: GuestRecord): string {
  const tpl = (template || DEFAULT_MESSAGE_TEMPLATE).trim();
  const passCode = (guest.passCode || guest.id).toUpperCase();
  const guestName =
    guest.hasSpouse && guest.spouseName ? `${guest.leadName} & ${guest.spouseName}` : guest.leadName || "Guest";
  const baseUrl = getCampaignBaseUrl();
  const passUrl = `${baseUrl}/pass/${passCode.toLowerCase()}`;
  const wishlistUrl = `${baseUrl}/wishlist`;
  const churchInfo = "Saturday, Nov 21, 2026 @ 09:30 AM — RCCG Victory Center, No 58 Iju Road, Agege, Lagos";
  const receptionInfo = "Saturday, Nov 21, 2026 @ 02:00 PM — Agege, Lagos (Details on Pass Card)";
  const dressCode = "Strictly Formal / African Regal (Mauve & Gold)";

  return tpl
    .replace(/\[Greeting[^\]]*\]|\{Greeting[^\}]*\}/gi, `Dear ${guestName},`)
    .replace(/\[Guest Name\]|\{Guest Name\}|\[guest_name\]|\{guest_name\}/gi, guestName)
    .replace(/\[PASS_CODE\]|\{PASS_CODE\}|\[pass_code\]|\{pass_code\}/gi, passCode)
    .replace(/\[PASS_URL\]|\{PASS_URL\}|\[pass_url\]|\{pass_url\}/gi, passUrl)
    .replace(/\[Church Venue & Time\]|\{Church Venue & Time\}/gi, churchInfo)
    .replace(/\[Reception Venue & Time\]|\{Reception Venue & Time\}/gi, receptionInfo)
    .replace(/\[Details\.\.\.\]|\[Details\]|\[Dress Code\]|\{Dress Code\}|\[dress_code\]|\{dress_code\}/gi, dressCode)
    .replace(
      /\[Wishlist Link\.\.\.\]|\[Wishlist Link\]|\{Wishlist Link\}|\[wishlist_link\]|\{wishlist_link\}/gi,
      wishlistUrl,
    );
}

const previewRendered = computed(() => {
  const sampleGuest: GuestRecord = {
    id: "sample",
    leadName: "Dr. Oluwaseun Adeleke",
    hasSpouse: true,
    spouseName: "Mrs. Folashade Adeleke",
    passCode: "WD6DUF",
    leadPhone: "2348012345678",
  };
  return renderTemplateForGuest(config.value.messageTemplate, sampleGuest);
});

const activeSenderTab = ref<string>("all");
const searchQuery = ref("");
const statusFilter = ref<
  | "all"
  | "pending"
  | "sent"
  | "previously_sent"
  | "never_sent"
  | "sent_today"
  | "both_pending"
  | "both_sent"
  | "email_pending"
  | "email_sent"
  | "email_sent_wa_pending"
  | "wa_pending_with_phone"
>("all");
const testPhone = ref("");
const testSenderSession = ref<string>("default");

const DATE_FIX_CUTOFF_ISO = "2026-11-09T12:00:00.000Z";

function isSentThisAfternoon(guest: GuestRecord): boolean {
  return Boolean(guest.invitationSentAt && guest.invitationSentAt >= DATE_FIX_CUTOFF_ISO);
}

function needsDateClarification(guest: GuestRecord): boolean {
  if (isSentThisAfternoon(guest)) return false;
  const hadOldSend =
    (guest.previousInvitationSentAt && guest.previousInvitationSentAt < DATE_FIX_CUTOFF_ISO) ||
    (guest.invitationSentAt && guest.invitationSentAt < DATE_FIX_CUTOFF_ISO);
  return Boolean(hadOldSend);
}

function isNeverSent(guest: GuestRecord): boolean {
  return !guest.invitationSentAt && !guest.previousInvitationSentAt;
}

const sendingId = ref<string | null>(null);
const currentProcessingId = ref<string | null>(null);

const isDispatching = ref(false);
const isPaused = ref(false);
const dispatchStrategy = ref<"interleaved" | "sequential">("interleaved");
const currentSenderNotice = ref<string>("");

function formatSentVia(via?: string): string {
  if (!via) return "Sent";
  if (via.includes("Groom") || via.includes("groom")) return "Sent: Groom";
  if (via.includes("Bride") || via.includes("bride")) return "Sent: Bride";
  if (via.includes("default") || via.includes("busola")) return "Sent: My Phone";
  return via.replace("whatsapp:", "Sent: ");
}

const currentPage = ref(1);
const pageSize = ref(25);

const wahaSessions = ref<WahaSessionInfo[]>([]);

const config = ref<CampaignSettings>({
  senders: [
    { id: "groom", name: "Groom", phone: "", wahaSession: "Groom", status: "SCAN_QR_CODE" },
    { id: "bride", name: "Bride", phone: "", wahaSession: "Bride", status: "SCAN_QR_CODE" },
    { id: "adun", name: "Adun", phone: "2347086492639", wahaSession: "AdunsPhone", status: "FAILED" },
    { id: "busola", name: "My Phone", phone: "2347065055605", wahaSession: "default", status: "WORKING" },
  ],
  groupSenderMap: {},
  paceSeconds: 8,
  messageTemplate: "",
});

const rsvpGroups = ref<RSVPGroup[]>([]);
const guests = ref<GuestRecord[]>([]);

const totalGuests = computed(() => guests.value.length);
const sentCount = computed(() => guests.value.filter((g) => g.invitationSent).length);
const emailSentCount = computed(() => guests.value.filter((g) => g.emailSent).length);
const emailPendingCount = computed(() => guests.value.filter((g) => !g.emailSent && g.leadEmail).length);
const guestsWithEmailCount = computed(() => guests.value.filter((g) => g.leadEmail).length);
const emailProgressPercent = computed(() => {
  if (guestsWithEmailCount.value === 0) return 0;
  return Math.round((emailSentCount.value / guestsWithEmailCount.value) * 100);
});

const bothSentCount = computed(() => guests.value.filter((g) => g.invitationSent && g.emailSent).length);
const bothPendingCount = computed(() => guests.value.filter((g) => !g.invitationSent || !g.emailSent).length);
const bothProgressPercent = computed(() => {
  if (totalGuests.value === 0) return 0;
  return Math.round((bothSentCount.value / totalGuests.value) * 100);
});

const emailSentWaPendingCount = computed(() => guests.value.filter((g) => g.emailSent && !g.invitationSent).length);
const waPendingWithPhoneCount = computed(() => guests.value.filter((g) => !g.invitationSent && g.leadPhone).length);
const pendingTotalCount = computed(() => guests.value.filter((g) => !g.invitationSent).length);
const previouslySentCount = computed(() => guests.value.filter(needsDateClarification).length);
const neverSentCount = computed(() => guests.value.filter(isNeverSent).length);
const sentThisAfternoonCount = computed(() => guests.value.filter(isSentThisAfternoon).length);
const progressPercent = computed(() => {
  if (totalGuests.value === 0) return 0;
  return Math.round((sentCount.value / totalGuests.value) * 100);
});

const activeSenderLabel = computed(() => {
  if (activeSenderTab.value === "all") return "All Senders";
  if (activeSenderTab.value === "unassigned") return "Unassigned Guests";
  const s = config.value.senders.find((s) => s.id === activeSenderTab.value);
  return s ? s.name : "Assigned Sender";
});

const unassignedPendingCount = computed(() => {
  return guests.value.filter((g) => !g.invitationSent && resolveSenderForGuest(g) === "unassigned").length;
});

function unassignAllGroups() {
  if (confirm("Are you sure you want to unassign all groups?")) {
    config.value.groupSenderMap = {};
  }
}

// ── Bulk-assign every guest who hasn't received WhatsApp yet ──
const bulkAssignSenderIds = ref<string[]>([]);
const bulkAssignScope = ref<"all_unsent" | "email_sent_only">("all_unsent");

const bulkAssignTargets = computed(() =>
  guests.value.filter(
    (g) =>
      !g.invitationSent &&
      g.leadPhone &&
      (bulkAssignScope.value === "all_unsent" || g.emailSent),
  ),
);

function toggleBulkSender(id: string) {
  const i = bulkAssignSenderIds.value.indexOf(id);
  if (i === -1) bulkAssignSenderIds.value.push(id);
  else bulkAssignSenderIds.value.splice(i, 1);
}

const noPhoneUnsentGuests = computed(() => guests.value.filter((g) => !g.invitationSent && !g.leadPhone));

/** Returns true when assignments were applied and saved. */
async function applyBulkAssignment(silent: boolean): Promise<boolean> {
  const ids = bulkAssignSenderIds.value;
  const targets = bulkAssignTargets.value;
  if (ids.length === 0) {
    alert("Select at least one WhatsApp number to assign to.");
    return false;
  }
  if (targets.length === 0) {
    alert("No guests match: everyone with a phone has already received WhatsApp.");
    return false;
  }
  const notReady = ids.filter((id) => getSenderStatus(id) !== "WORKING").map((id) => getSenderName(id));
  const names = ids.map((id) => getSenderName(id)).join(", ");
  const warn = notReady.length ? `\n\nWarning: not connected (not WORKING): ${notReady.join(", ")}` : "";
  const verb = silent ? "Assign AND start sending to" : "Assign";
  if (!confirm(`${verb} ${targets.length} guest(s) who haven't received WhatsApp, evenly across: ${names}?${warn}`)) {
    return false;
  }

  const map = { ...(config.value.guestSenderMap || {}) };
  targets.forEach((g, i) => {
    map[g.id] = ids[i % ids.length];
  });
  config.value.guestSenderMap = map;
  return await saveSettings(silent);
}

async function assignUnsentToSenders() {
  await applyBulkAssignment(false);
}

async function assignAndStartSending() {
  if (isDispatching.value) return;
  if (!(await applyBulkAssignment(true))) return;
  activeChannel.value = "whatsapp";
  campaignMode.value = "pass";
  statusFilter.value = bulkAssignScope.value === "email_sent_only" ? "email_sent_wa_pending" : "wa_pending_with_phone";
  activeSenderTab.value = "all";
  await nextTick();
  await startAutoDispatch();
}

function assignGroupsRoundRobin() {
  const workingSenders = (config.value.senders || []).filter((s) => s.status === "WORKING");
  const pool = workingSenders.length > 0 ? workingSenders : (config.value.senders || []).filter((s) => s.id !== "adun");
  if (pool.length === 0) {
    alert("No active senders found to distribute across.");
    return;
  }
  const newMap: Record<string, string> = {};
  rsvpGroups.value.forEach((grp, idx) => {
    const s = pool[idx % pool.length];
    newMap[grp.id] = s.id;
  });
  config.value.groupSenderMap = newMap;
}

function getGroupGuestCount(groupId: string): number {
  return guests.value.filter((g) => {
    const gid = typeof g.group === "object" && g.group ? g.group.id : g.group;
    return gid === groupId;
  }).length;
}

function senderPendingCount(senderId: string): number {
  return guests.value.filter((g) => {
    if (g.invitationSent) return false;
    const assigned = resolveSenderForGuest(g);
    return assigned === senderId;
  }).length;
}

function resolveSenderForGuest(guest: GuestRecord): string {
  // 1. Explicit guest-level assignment
  if (config.value.guestSenderMap && config.value.guestSenderMap[guest.id]) {
    return config.value.guestSenderMap[guest.id];
  }
  // 2. Fallback to group routing
  const groupId = typeof guest.group === "object" && guest.group ? guest.group.id : guest.group;
  if (groupId && config.value.groupSenderMap[groupId]) {
    return config.value.groupSenderMap[groupId];
  }
  return "unassigned";
}

function getAssignedSenderName(group: any): string {
  const groupId = typeof group === "object" && group ? group.id : group;
  const senderId = groupId ? config.value.groupSenderMap[groupId] : undefined;
  if (!senderId || senderId === "unassigned") return "Unassigned";
  const s = config.value.senders.find((x) => x.id === senderId);
  return s ? s.name : "Unassigned";
}

function getAssignedSenderStatus(group: any): string {
  const groupId = typeof group === "object" && group ? group.id : group;
  const senderId = groupId ? config.value.groupSenderMap[groupId] : undefined;
  if (!senderId || senderId === "unassigned") return "";
  const s = config.value.senders.find((x) => x.id === senderId);
  return s?.status || "";
}

function getSenderName(senderId: string): string {
  if (!senderId || senderId === "unassigned") return "Unassigned";
  const s = config.value.senders.find((x) => x.id === senderId);
  return s ? s.name : "Unassigned";
}

function getSenderStatus(senderId: string): string {
  if (!senderId || senderId === "unassigned") return "";
  const s = config.value.senders.find((x) => x.id === senderId);
  return s?.status || "";
}

function getGroupName(group: any): string {
  if (!group) return "General";
  if (typeof group === "object") return group.name || "General";
  const match = rsvpGroups.value.find((g) => g.id === group);
  return match ? match.name : "General";
}

function formatPhoneDisplay(phone?: string): string {
  if (!phone) return "—";
  return phone.replace(/[^\d+]/g, "");
}

function formatDate(isoStr?: string): string {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

const filteredGuests = computed(() => {
  let list = guests.value;

  // Sender tab filter
  if (activeSenderTab.value !== "all") {
    list = list.filter((g) => resolveSenderForGuest(g) === activeSenderTab.value);
  }

  // Status filter
  if (statusFilter.value === "pending") {
    list = list.filter((g) => !g.invitationSent);
  } else if (statusFilter.value === "sent") {
    list = list.filter((g) => g.invitationSent);
  } else if (statusFilter.value === "previously_sent") {
    list = list.filter(needsDateClarification);
  } else if (statusFilter.value === "never_sent") {
    list = list.filter(isNeverSent);
  } else if (statusFilter.value === "sent_today") {
    list = list.filter(isSentThisAfternoon);
  } else if (statusFilter.value === "both_pending") {
    list = list.filter((g) => !g.invitationSent || !g.emailSent);
  } else if (statusFilter.value === "both_sent") {
    list = list.filter((g) => g.invitationSent && g.emailSent);
  } else if (statusFilter.value === "email_pending") {
    list = list.filter((g) => !g.emailSent && g.leadEmail);
  } else if (statusFilter.value === "email_sent") {
    list = list.filter((g) => g.emailSent);
  } else if (statusFilter.value === "email_sent_wa_pending") {
    list = list.filter((g) => g.emailSent && !g.invitationSent);
  } else if (statusFilter.value === "wa_pending_with_phone") {
    list = list.filter((g) => !g.invitationSent && g.leadPhone);
  }

  // Search filter
  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    list = list.filter((g) => {
      const name = (g.leadName || "").toLowerCase();
      const spouse = (g.spouseName || "").toLowerCase();
      const code = (g.passCode || "").toLowerCase();
      const phone = (g.leadPhone || "").toLowerCase();
      const email = (g.leadEmail || "").toLowerCase();
      return name.includes(q) || spouse.includes(q) || code.includes(q) || phone.includes(q) || email.includes(q);
    });
  }

  return list;
});

const pendingGuestsInView = computed(() => {
  if (campaignMode.value === "clarification" || statusFilter.value === "previously_sent") {
    return filteredGuests.value.filter(needsDateClarification);
  }
  return filteredGuests.value.filter((g) => !g.invitationSent);
});

const pendingBothInView = computed(() => {
  return filteredGuests.value.filter((g) => !g.invitationSent || !g.emailSent);
});

const pendingEmailsInView = computed(() => {
  return filteredGuests.value.filter((g) => !g.emailSent && g.leadEmail);
});

const totalPages = computed(() => Math.ceil(filteredGuests.value.length / pageSize.value));
const paginationStart = computed(() => {
  if (filteredGuests.value.length === 0) return 0;
  return (currentPage.value - 1) * pageSize.value + 1;
});
const paginationEnd = computed(() => {
  return Math.min(currentPage.value * pageSize.value, filteredGuests.value.length);
});

const displayedGuests = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredGuests.value.slice(start, start + pageSize.value);
});

function buildWaLink(guest: GuestRecord): string {
  const phone = (guest.leadPhone || "").replace(/[^\d]/g, "");
  const text = renderTemplateForGuest(config.value.messageTemplate, guest);
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

const syncMessage = ref<string | null>(null);

function syncWahaSessionsIntoSenders(sessions: WahaSessionInfo[]) {
  if (!Array.isArray(sessions)) return;
  wahaSessions.value = sessions;

  const currentSenders = Array.isArray(config.value.senders) ? [...config.value.senders] : [];

  const updatedSenders = currentSenders.map((s) => {
    const sSession = (s.wahaSession || s.id || s.name || "").toLowerCase();
    const match = sessions.find((sess) => {
      const sessName = (sess.name || "").toLowerCase();
      return sessName === sSession || sessName.includes(sSession) || sSession.includes(sessName);
    });

    if (match) {
      return {
        ...s,
        wahaSession: match.name,
        status: match.status,
        phone: match.phone || s.phone || "",
      };
    }
    return s;
  });

  // Also include any sessions from WAHA not yet in senders
  for (const sess of sessions) {
    const exists = updatedSenders.some(
      (s) => (s.wahaSession || s.id || "").toLowerCase() === (sess.name || "").toLowerCase(),
    );
    if (!exists) {
      updatedSenders.push({
        id: (sess.name || "").toLowerCase(),
        name: sess.pushName || sess.name,
        phone: sess.phone || "",
        wahaSession: sess.name,
        status: sess.status,
      });
    }
  }

  config.value = {
    ...config.value,
    senders: updatedSenders,
  };
}

const syncError = ref<string | null>(null);

async function fetchData() {
  loading.value = true;
  syncMessage.value = null;
  syncError.value = null;
  try {
    const res: any = await $fetch(`/api/pass-campaign/status?_t=${Date.now()}`, {
      headers: adminAuthHeaders(),
    });
    if (res.success) {
      if (res.config) {
        config.value = {
          ...config.value,
          ...res.config,
          messageTemplate: res.config.messageTemplate || DEFAULT_MESSAGE_TEMPLATE,
          paceSeconds: res.config.paceSeconds || 8,
        };
      } else if (!config.value.messageTemplate) {
        config.value.messageTemplate = DEFAULT_MESSAGE_TEMPLATE;
      }
      rsvpGroups.value = res.rsvpGroups || res.groups || [];
      guests.value = res.guests || [];
      if (Array.isArray(res.sessions)) {
        syncWahaSessionsIntoSenders(res.sessions);
      }

      const workingCount = (config.value.senders || []).filter((s) => s.status === "WORKING").length;
      syncMessage.value = `WAHA Synced: ${workingCount} active sender(s) connected`;
      setTimeout(() => {
        syncMessage.value = null;
      }, 4000);
    }
  } catch (err: any) {
    console.error("Failed to load pass campaign data:", err);
    syncError.value = err?.data?.message || err?.message || "Failed to authenticate or fetch status";
  } finally {
    loading.value = false;
  }
}

async function saveSettings(silent = false): Promise<boolean> {
  savingSettings.value = true;
  try {
    await $fetch("/api/pass-campaign/settings", {
      method: "POST",
      headers: adminAuthHeaders(),
      body: {
        senders: config.value.senders,
        groupSenderMap: config.value.groupSenderMap,
        guestSenderMap: config.value.guestSenderMap || {},
        paceSeconds: config.value.paceSeconds,
        messageTemplate: config.value.messageTemplate,
      },
    });
    if (!silent) alert("Campaign settings and message template saved successfully!");
    return true;
  } catch (err: any) {
    alert("Failed to save settings: " + (err.data?.message || err.message));
    return false;
  } finally {
    savingSettings.value = false;
  }
}

const resetting = ref(false);

async function confirmResetCampaign() {
  if (
    !confirm(
      `Are you sure you want to mark all ${sentCount.value} sent passes as Pending to re-send?\n\nYour previous send history and timestamps will be safely preserved.`,
    )
  ) {
    return;
  }
  resetting.value = true;
  try {
    const res: any = await $fetch("/api/pass-campaign/reset", {
      method: "POST",
      headers: adminAuthHeaders(),
    });
    if (res.success) {
      alert(res.message || "Passes have been reset to pending. Send history is preserved.");
      await fetchData();
    } else {
      alert("Failed to reset: " + (res.message || "Unknown error"));
    }
  } catch (err: any) {
    alert("Failed to reset: " + (err.data?.message || err.message));
  } finally {
    resetting.value = false;
  }
}

async function sendTestPass() {
  if (!testPhone.value) return;
  testing.value = true;
  try {
    const res: any = await $fetch("/api/pass-campaign/test", {
      method: "POST",
      headers: adminAuthHeaders(),
      body: {
        phone: testPhone.value,
        session: testSenderSession.value || undefined,
        customTemplate: config.value.messageTemplate,
        attachImage: config.value.attachImage ?? true,
      },
    });
    if (res.success) {
      alert(`Test pass sent to ${testPhone.value}`);
    } else {
      alert("Test send failed: " + (res.message || "Unknown error"));
    }
  } catch (err: any) {
    alert("Test send failed: " + (err.data?.message || err.message));
  } finally {
    testing.value = false;
  }
}

async function sendTestEmail() {
  if (!testEmail.value) return;
  testingEmail.value = true;
  try {
    const res: any = await $fetch("/api/pass-campaign/test-email", {
      method: "POST",
      headers: adminAuthHeaders(),
      body: { email: testEmail.value },
    });
    if (res.success) {
      alert(`Test pass email delivered to ${testEmail.value}!`);
    } else {
      alert("Test email failed: " + (res.message || "Unknown error"));
    }
  } catch (err: any) {
    alert("Test email failed: " + (err.data?.message || err.message));
  } finally {
    testingEmail.value = false;
  }
}

async function sendSingleEmail(guest: GuestRecord) {
  if (!guest.leadEmail) {
    alert(`Guest "${guest.leadName}" has no email address on record.`);
    return;
  }
  emailingId.value = guest.id;
  try {
    const res: any = await $fetch(`/api/invitations/send-email/${guest.id}`, {
      method: "POST",
      headers: adminAuthHeaders(),
      body: { email: guest.leadEmail },
    });
    if (res.success) {
      guest.emailSent = true;
      guest.emailSentAt = new Date().toISOString();
      guest.invitationSent = true;
    } else {
      alert("Failed to send email pass: " + (res.message || "Error"));
    }
  } catch (err: any) {
    alert("Failed to send email: " + (err.data?.message || err.message));
  } finally {
    emailingId.value = null;
  }
}

async function sendBothToGuest(guest: GuestRecord) {
  sendingBothId.value = guest.id;
  try {
    // 1. WhatsApp
    const senderId = resolveSenderForGuest(guest);
    if (senderId !== "unassigned") {
      const sender = config.value.senders.find((s) => s.id === senderId);
      const wahaSession = sender?.wahaSession || "default";
      try {
        const waRes: any = await $fetch("/api/pass-campaign/send", {
          method: "POST",
          headers: adminAuthHeaders(),
          body: {
            rsvpId: guest.id,
            session: wahaSession,
            customTemplate: config.value.messageTemplate,
            attachImage: config.value.attachImage ?? true,
          },
        });
        if (waRes.success) {
          guest.invitationSent = true;
          guest.invitationSentAt = new Date().toISOString();
          guest.invitationSentVia = `whatsapp:${wahaSession}`;
        }
      } catch (e: any) {
        console.error("WhatsApp dispatch error:", e);
      }
    }

    // 2. Email
    if (guest.leadEmail) {
      try {
        const emRes: any = await $fetch(`/api/invitations/send-email/${guest.id}`, {
          method: "POST",
          headers: adminAuthHeaders(),
          body: { email: guest.leadEmail },
        });
        if (emRes.success) {
          guest.emailSent = true;
          guest.emailSentAt = new Date().toISOString();
          guest.invitationSent = true;
        }
      } catch (e: any) {
        console.error("Email dispatch error:", e);
      }
    }
  } finally {
    sendingBothId.value = null;
  }
}

async function startBothAutoDispatch() {
  const targetList = pendingBothInView.value;
  if (targetList.length === 0) {
    alert("No pending guests for WhatsApp or Email in the current view.");
    return;
  }

  isDispatching.value = true;
  isPaused.value = false;

  for (const guest of targetList) {
    if (!isDispatching.value) break;

    while (isPaused.value) {
      await new Promise((r) => setTimeout(r, 500));
      if (!isDispatching.value) break;
    }
    if (!isDispatching.value) break;

    currentProcessingId.value = guest.id;
    const senderId = resolveSenderForGuest(guest);
    const sender = config.value.senders.find((s) => s.id === senderId);
    const wahaSession = sender?.wahaSession || "default";

    currentSenderNotice.value = `${guest.leadName} (WA: ${sender?.name || "WAHA"} + Email: ${guest.leadEmail || "None"})`;

    // 1. WhatsApp
    if (senderId !== "unassigned") {
      try {
        const waRes: any = await $fetch("/api/pass-campaign/send", {
          method: "POST",
          headers: adminAuthHeaders(),
          body: {
            rsvpId: guest.id,
            session: wahaSession,
            customTemplate: config.value.messageTemplate,
            attachImage: config.value.attachImage ?? true,
          },
        });
        if (waRes.success) {
          guest.invitationSent = true;
          guest.invitationSentAt = new Date().toISOString();
          guest.invitationSentVia = `whatsapp:${wahaSession}`;
        }
      } catch (e) {
        console.error(`WhatsApp auto send error for ${guest.leadName}:`, e);
      }
    }

    // 2. Email
    if (guest.leadEmail) {
      try {
        const emRes: any = await $fetch(`/api/invitations/send-email/${guest.id}`, {
          method: "POST",
          headers: adminAuthHeaders(),
          body: { email: guest.leadEmail },
        });
        if (emRes.success) {
          guest.emailSent = true;
          guest.emailSentAt = new Date().toISOString();
          guest.invitationSent = true;
        }
      } catch (e) {
        console.error(`Email auto send error for ${guest.leadName}:`, e);
      }
    }

    const delay = (config.value.paceSeconds || 8) * 1000;
    await new Promise((r) => setTimeout(r, delay));
  }

  currentProcessingId.value = null;
  currentSenderNotice.value = "";
  isDispatching.value = false;
  isPaused.value = false;
}

async function startEmailAutoDispatch() {
  const targetList = pendingEmailsInView.value;
  if (targetList.length === 0) {
    alert("No pending guests with email addresses in the current view.");
    return;
  }

  isDispatching.value = true;
  isPaused.value = false;

  for (const guest of targetList) {
    if (!isDispatching.value) break;

    while (isPaused.value) {
      await new Promise((r) => setTimeout(r, 500));
      if (!isDispatching.value) break;
    }
    if (!isDispatching.value) break;

    currentProcessingId.value = guest.id;
    currentSenderNotice.value = `Email: ${guest.leadName} (${guest.leadEmail})`;

    try {
      const res: any = await $fetch(`/api/invitations/send-email/${guest.id}`, {
        method: "POST",
        headers: adminAuthHeaders(),
        body: { email: guest.leadEmail },
      });
      if (res.success) {
        guest.emailSent = true;
        guest.emailSentAt = new Date().toISOString();
        guest.invitationSent = true;
      }
    } catch (e) {
      console.error(`Failed to send email pass to ${guest.leadName}:`, e);
    }

    const delay = Math.max(1500, (emailPaceSeconds.value || 2) * 1000);
    await new Promise((r) => setTimeout(r, delay));
  }

  currentProcessingId.value = null;
  currentSenderNotice.value = "";
  isDispatching.value = false;
  isPaused.value = false;
}

async function sendSinglePass(guest: GuestRecord) {
  const senderId = resolveSenderForGuest(guest);
  if (senderId === "unassigned") {
    alert(
      `This guest belongs to "${getGroupName(guest.group)}", which is currently Unassigned. Please assign this group to a dispatch phone in "Configure Routing & Message Template" first.`,
    );
    return;
  }

  sendingId.value = guest.id;
  const sender = config.value.senders.find((s) => s.id === senderId);
  const wahaSession = sender?.wahaSession || "default";

  try {
    const res: any = await $fetch("/api/pass-campaign/send", {
      method: "POST",
      headers: adminAuthHeaders(),
      body: {
        rsvpId: guest.id,
        session: wahaSession,
        customTemplate: config.value.messageTemplate,
        attachImage: config.value.attachImage ?? true,
      },
    });
    if (res.success) {
      guest.invitationSent = true;
      guest.invitationSentAt = new Date().toISOString();
      guest.invitationSentVia = "whatsapp";
    } else {
      alert("Failed to dispatch pass: " + (res.message || "Error"));
    }
  } catch (err: any) {
    alert("Failed to dispatch: " + (err.data?.message || err.message));
  } finally {
    sendingId.value = null;
  }
}

async function startAutoDispatch() {
  if (pendingGuestsInView.value.length === 0) return;

  isDispatching.value = true;
  isPaused.value = false;

  let targetList: GuestRecord[] = [];

  if (dispatchStrategy.value === "interleaved") {
    // Separate pending guests strictly by their assigned sender
    const queues: Record<string, GuestRecord[]> = {};
    for (const guest of pendingGuestsInView.value) {
      const senderId = resolveSenderForGuest(guest);
      if (senderId === "unassigned") continue;
      if (!queues[senderId]) queues[senderId] = [];
      queues[senderId].push(guest);
    }

    // Interleave across sender phones: Groom -> Bride -> My Phone -> repeat
    const senderOrder = ["groom", "bride", "busola"];
    for (const key of Object.keys(queues)) {
      if (!senderOrder.includes(key)) senderOrder.push(key);
    }

    let hasRemaining = true;
    while (hasRemaining) {
      hasRemaining = false;
      for (const sId of senderOrder) {
        if (queues[sId] && queues[sId].length > 0) {
          targetList.push(queues[sId].shift()!);
          hasRemaining = true;
        }
      }
    }
  } else {
    // Sequential order (as displayed)
    targetList = pendingGuestsInView.value.filter((g) => resolveSenderForGuest(g) !== "unassigned");
  }

  if (targetList.length === 0) {
    alert("All guests in the current view are currently Unassigned. Please assign groups in Group Routing first.");
    isDispatching.value = false;
    return;
  }

  for (const guest of targetList) {
    if (!isDispatching.value) break;

    while (isPaused.value) {
      await new Promise((r) => setTimeout(r, 500));
      if (!isDispatching.value) break;
    }
    if (!isDispatching.value) break;

    currentProcessingId.value = guest.id;

    // Sender is GUARANTEED to be the guest's assigned sender (Groom, Bride, or My Phone)
    const senderId = resolveSenderForGuest(guest);
    const sender = config.value.senders.find((s) => s.id === senderId);
    if (!sender) continue;

    const wahaSession = sender?.wahaSession || "default";
    currentSenderNotice.value = `${sender.name} (${sender.phone ? formatPhoneDisplay(sender.phone) : wahaSession})`;

    try {
      const res: any = await $fetch("/api/pass-campaign/send", {
        method: "POST",
        headers: adminAuthHeaders(),
        body: {
          rsvpId: guest.id,
          session: wahaSession,
          customTemplate: config.value.messageTemplate,
          attachImage: config.value.attachImage ?? true,
        },
      });
      if (res.success) {
        guest.invitationSent = true;
        guest.invitationSentAt = new Date().toISOString();
        guest.invitationSentVia = `whatsapp:${wahaSession}`;
      }
    } catch (e) {
      console.error(`Failed to send to ${guest.leadName}:`, e);
    }

    // Pacing delay (8-15 seconds)
    const delay = (config.value.paceSeconds || 8) * 1000;
    await new Promise((r) => setTimeout(r, delay));
  }

  currentProcessingId.value = null;
  currentSenderNotice.value = "";
  isDispatching.value = false;
  isPaused.value = false;
}

function pauseAutoDispatch() {
  isPaused.value = !isPaused.value;
}

function stopAutoDispatch() {
  isDispatching.value = false;
  isPaused.value = false;
  currentProcessingId.value = null;
}

onMounted(() => {
  fetchData();
});
</script>
