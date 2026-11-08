<template>
  <div class="space-y-4 text-slate-800">
    <!-- Top Bar: Sender Segmented Controls + Actions -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
      <!-- Senders Tabs -->
      <div class="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          @click="activeSenderTab = 'all'"
          class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
          :class="activeSenderTab === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'"
        >
          All Senders
          <span class="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full" :class="activeSenderTab === 'all' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'">
            {{ totalGuests }}
          </span>
        </button>

        <button
          type="button"
          @click="activeSenderTab = 'unassigned'"
          class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5"
          :class="activeSenderTab === 'unassigned' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'"
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
          :class="activeSenderTab === s.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'"
        >
          <!-- Session Status Indicator -->
          <span
            class="w-2 h-2 rounded-full shrink-0"
            :class="{
              'bg-emerald-500': s.status === 'WORKING',
              'bg-amber-400': s.status === 'SCAN_QR_CODE',
              'bg-rose-500': s.status === 'FAILED' || s.status === 'STOPPED',
              'bg-slate-300': !s.status || s.status === 'UNKNOWN'
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
          <svg class="w-3.5 h-3.5 text-slate-500" :class="{ 'animate-spin': loading }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Sync from WAHA</span>
        </button>

        <button
          type="button"
          @click="showSettings = !showSettings"
          class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-md bg-white hover:bg-slate-50 text-slate-700 transition"
        >
          <svg class="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
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
              :class="settingsTab === 'template' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Message Template & Pacing</span>
            </button>
            <button
              type="button"
              @click="settingsTab = 'routing'"
              class="px-2.5 py-1 text-xs font-medium rounded transition inline-flex items-center gap-1.5"
              :class="settingsTab === 'routing' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>Routing & Senders</span>
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="saveSettings"
            :disabled="savingSettings"
            class="px-3 py-1 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50 inline-flex items-center gap-1 shadow-xs transition"
          >
            <svg v-if="savingSettings" class="w-3 h-3 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" stroke-width="4" stroke="currentColor" class="opacity-25"/>
              <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" class="opacity-75"/>
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
                Click any tag below to insert it. The personalized Access Card image is automatically attached to each message.
              </p>
            </div>
            <button
              type="button"
              @click="resetTemplateToDefault"
              class="text-[11px] font-medium text-slate-500 hover:text-slate-800 underline self-start sm:self-auto"
            >
              Reset to Default
            </button>
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
              <svg class="w-2.5 h-2.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
              </select>
              <span class="text-[11px] text-slate-400 hidden md:inline">Spreads send volume to avoid WhatsApp anti-spam flags.</span>
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
            <span class="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-medium">
              + VIP ACCESS CARD (PNG attached)
            </span>
          </div>
          <pre class="font-sans text-xs whitespace-pre-wrap text-slate-800 bg-slate-50/80 p-3 rounded border border-slate-200/80 leading-relaxed max-h-48 overflow-y-auto">{{ previewRendered }}</pre>
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
                        'bg-slate-300': !s.status || s.status === 'UNKNOWN'
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
                        'bg-rose-50 text-rose-700 border border-rose-200': s.status === 'FAILED' || s.status === 'STOPPED',
                        'bg-slate-100 text-slate-600': !s.status
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
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  @click="assignGroupsRoundRobin"
                  class="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium underline"
                  title="Evenly split groups across connected phones (1 Groom, 1 Bride, 1 My Phone)"
                >
                  Auto-Split Groups
                </button>
                <span class="text-slate-300">·</span>
                <button
                  type="button"
                  @click="unassignAllGroups"
                  class="text-[11px] text-rose-600 hover:text-rose-700 font-medium underline"
                  title="Clear all sender assignments"
                >
                  Unassign All
                </button>
              </div>
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

        <!-- Test Send Bar -->
        <div class="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-medium text-slate-700">Test Send:</span>
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
              placeholder="e.g. 08105733592 or 2348105733592"
              class="px-2.5 py-1 text-xs border border-slate-200 rounded font-mono bg-white text-slate-800 w-52 focus:border-slate-400 focus:outline-none"
            />
            <button
              type="button"
              @click="sendTestPass"
              :disabled="testing || !testPhone"
              class="px-3 py-1 text-xs font-medium bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <svg v-if="testing" class="w-3 h-3 animate-spin text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" stroke-width="4" stroke="currentColor" class="opacity-25"/>
                <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" class="opacity-75"/>
              </svg>
              <span>Send Test Pass</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Execution Bar / Progress Stats -->
    <div class="p-3 border border-slate-200 rounded-lg bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div class="space-y-1 flex-1">
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-slate-900">
              {{ sentCount }} / {{ totalGuests }} passes dispatched
            </span>
            <span class="text-slate-400">·</span>
            <span class="text-slate-600">{{ progressPercent }}% completed</span>
          </div>
          <span class="text-[11px] text-slate-500 font-mono">
            Active view: {{ activeSenderLabel }} ({{ filteredGuests.length }} guests)
          </span>
        </div>
        <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            class="bg-slate-900 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${progressPercent}%` }"
          ></div>
        </div>
      </div>

      <!-- Auto-dispatch Controls -->
      <div class="flex flex-wrap items-center gap-2">
        <div v-if="!isDispatching" class="flex items-center gap-1.5">
          <label class="text-[11px] font-medium text-slate-600 hidden sm:inline">Strategy:</label>
          <select
            v-model="dispatchStrategy"
            class="px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:border-slate-400 font-medium"
            title="Choose how passes are distributed across sender phones"
          >
            <option value="round-robin">🔄 Round-Robin (1 Groom ➔ 1 Bride ➔ 1 My Phone)</option>
            <option value="group">📁 By Assigned Group</option>
          </select>
        </div>

        <template v-if="!isDispatching">
          <button
            type="button"
            @click="startAutoDispatch"
            :disabled="pendingGuestsInView.length === 0"
            class="px-3.5 py-1.5 text-xs font-medium rounded-md bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5 transition"
          >
            <svg class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span>Start Auto-Send ({{ pendingGuestsInView.length }})</span>
          </button>
        </template>
        <template v-else>
          <div v-if="currentSenderNotice" class="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Sending via {{ currentSenderNotice }}</span>
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
        <svg class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
          class="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:border-slate-400"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending Only ({{ pendingTotalCount }})</option>
          <option value="sent">Sent Only ({{ sentCount }})</option>
        </select>
        <span class="text-xs text-slate-500">{{ displayedGuests.length }} of {{ filteredGuests.length }}</span>
      </div>
    </div>

    <!-- Guests Table -->
    <div class="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
            <tr>
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
                <div class="flex items-center gap-1.5">
                  <span>{{ guest.leadName }}</span>
                  <span
                    v-if="guest.hasSpouse && guest.spouseName"
                    class="text-[10px] px-1 py-0.2 bg-slate-100 text-slate-600 rounded font-normal"
                  >
                    + {{ guest.spouseName }}
                  </span>
                </div>
              </td>

              <!-- Pass Code -->
              <td class="px-3.5 py-2.5 font-mono font-semibold text-slate-800">
                <span class="px-1.5 py-0.5 bg-slate-100 rounded text-[11px] border border-slate-200/60">
                  {{ guest.passCode || "—" }}
                </span>
              </td>

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
                  v-else-if="dispatchStrategy === 'round-robin'"
                  class="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.5 rounded"
                  title="Will rotate across connected phones (1 Groom, 1 Bride, 1 My Phone)"
                >
                  <span>🔄 Round-Robin</span>
                </span>
                <span
                  v-else-if="getAssignedSenderName(guest.group) !== 'Unassigned'"
                  class="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full shrink-0"
                    :class="{
                      'bg-emerald-500': getAssignedSenderStatus(guest.group) === 'WORKING',
                      'bg-amber-400': getAssignedSenderStatus(guest.group) === 'SCAN_QR_CODE',
                      'bg-rose-500': getAssignedSenderStatus(guest.group) === 'FAILED',
                      'bg-slate-300': !getAssignedSenderStatus(guest.group)
                    }"
                  />
                  <span>{{ getAssignedSenderName(guest.group) }}</span>
                </span>
                <span v-else class="text-[11px] text-slate-400 italic">
                  Unassigned
                </span>
              </td>

              <!-- Status -->
              <td class="px-3.5 py-2.5">
                <span
                  v-if="guest.invitationSent"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                >
                  <svg class="w-3 h-3 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Sent</span>
                  <span v-if="guest.invitationSentAt" class="text-emerald-500 font-mono">
                    ({{ formatDate(guest.invitationSentAt) }})
                  </span>
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <span>Pending</span>
                </span>
              </td>

              <!-- Actions -->
              <td class="px-3.5 py-2.5 text-right space-x-1.5">
                <!-- Direct WhatsApp Click-to-Send Link -->
                <a
                  :href="buildWaLink(guest)"
                  target="_blank"
                  rel="noopener"
                  class="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium border border-slate-200 rounded hover:bg-slate-50 text-slate-700 transition"
                  title="Open direct WhatsApp conversation"
                >
                  <span>Open WhatsApp</span>
                  <svg class="w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>

                <!-- Automated Send via WAHA -->
                <button
                  type="button"
                  @click="sendSinglePass(guest)"
                  :disabled="sendingId === guest.id || isDispatching"
                  class="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50 transition"
                >
                  <svg v-if="sendingId === guest.id" class="w-3 h-3 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" stroke-width="4" stroke="currentColor" class="opacity-25"/>
                    <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" class="opacity-75"/>
                  </svg>
                  <span>{{ guest.invitationSent ? "Resend" : "Send Pass" }}</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="px-3.5 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
        <div>
          Showing {{ paginationStart }} - {{ paginationEnd }} of {{ filteredGuests.length }} guests
        </div>
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
import { ref, computed, onMounted } from "vue";
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
  paceSeconds: number;
  messageTemplate: string;
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
  attending?: boolean;
  invitationSent?: boolean;
  invitationSentAt?: string;
  invitationSentVia?: string;
}

const loading = ref(false);
const savingSettings = ref(false);
const testing = ref(false);
const showSettings = ref(false);
const settingsTab = ref<"template" | "routing">("template");
const showPreview = ref(true);
const templateTextarea = ref<HTMLTextAreaElement | null>(null);

const DEFAULT_MESSAGE_TEMPLATE = `[Greeting, e.g. Dear [Guest Name] / Hi [Guest Name]!]

We can't wait to celebrate with you at #TheSweetUnion! 💍✨

🎟️ YOUR RECEPTION PASS:
Your digital pass code is *[PASS_CODE]*.
Access your official entry card and itinerary here:
[PASS_URL]

⚠️ IMPORTANT VENUE & ENTRY INFO:
• *Church Ceremony:* [Church Venue & Time] (Open to all friends and family)
• *Wedding Reception:* [Reception Venue & Time]
  *Please note: The digital pass above is strictly required for entry at the reception venue. Kindly have it ready on your phone.*

❓ FREQUENTLY ASKED QUESTIONS:
• Colors / Dress Code: [Details...]
• Gifts & Registry: [Wishlist Link...]

With love,
Adun & Uche`;

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

function resetTemplateToDefault() {
  if (confirm("Reset WhatsApp message template back to the standard default?")) {
    config.value.messageTemplate = DEFAULT_MESSAGE_TEMPLATE;
  }
}

function renderTemplateForGuest(template: string, guest: GuestRecord): string {
  const tpl = (template || DEFAULT_MESSAGE_TEMPLATE).trim();
  const passCode = (guest.passCode || guest.id).toUpperCase();
  const guestName = guest.hasSpouse && guest.spouseName ? `${guest.leadName} & ${guest.spouseName}` : (guest.leadName || "Guest");
  const passUrl = `https://thesweetunion.com/pass/${passCode.toLowerCase()}`;
  const wishlistUrl = `https://thesweetunion.com/wishlist`;
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
    .replace(/\[Wishlist Link\.\.\.\]|\[Wishlist Link\]|\{Wishlist Link\}|\[wishlist_link\]|\{wishlist_link\}/gi, wishlistUrl);
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
const statusFilter = ref<"all" | "pending" | "sent">("all");
const testPhone = ref("");
const testSenderSession = ref<string>("default");

const sendingId = ref<string | null>(null);
const currentProcessingId = ref<string | null>(null);

const isDispatching = ref(false);
const isPaused = ref(false);
const dispatchStrategy = ref<"round-robin" | "group">("round-robin");
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
const pendingTotalCount = computed(() => guests.value.filter((g) => !g.invitationSent).length);
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
  }

  // Search filter
  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    list = list.filter((g) => {
      const name = (g.leadName || "").toLowerCase();
      const spouse = (g.spouseName || "").toLowerCase();
      const code = (g.passCode || "").toLowerCase();
      const phone = (g.leadPhone || "").toLowerCase();
      return name.includes(q) || spouse.includes(q) || code.includes(q) || phone.includes(q);
    });
  }

  return list;
});

const pendingGuestsInView = computed(() => {
  return filteredGuests.value.filter((g) => !g.invitationSent);
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
      (s) => (s.wahaSession || s.id || "").toLowerCase() === (sess.name || "").toLowerCase()
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

async function saveSettings() {
  savingSettings.value = true;
  try {
    await $fetch("/api/pass-campaign/settings", {
      method: "POST",
      headers: adminAuthHeaders(),
      body: {
        senders: config.value.senders,
        groupSenderMap: config.value.groupSenderMap,
        paceSeconds: config.value.paceSeconds,
        messageTemplate: config.value.messageTemplate,
      },
    });
    alert("Campaign settings and message template saved successfully!");
  } catch (err: any) {
    alert("Failed to save settings: " + (err.data?.message || err.message));
  } finally {
    savingSettings.value = false;
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

async function sendSinglePass(guest: GuestRecord) {
  const senderId = resolveSenderForGuest(guest);
  if (senderId === "unassigned") {
    alert(`This guest belongs to "${getGroupName(guest.group)}", which is currently Unassigned. Please assign this group to a dispatch phone in "Configure Routing & Message Template" first.`);
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

  const workingSenders = (config.value.senders || []).filter((s) => s.status === "WORKING");
  const pool = workingSenders.length > 0 ? workingSenders : (config.value.senders || []).filter((s) => s.id !== "adun");

  if (dispatchStrategy.value === "round-robin" && pool.length === 0) {
    alert("No active WhatsApp sender sessions are connected. Please connect at least one phone first.");
    return;
  }

  isDispatching.value = true;
  isPaused.value = false;

  const targetList = [...pendingGuestsInView.value];
  let senderIndex = 0;

  for (const guest of targetList) {
    if (!isDispatching.value) break;

    while (isPaused.value) {
      await new Promise((r) => setTimeout(r, 500));
      if (!isDispatching.value) break;
    }
    if (!isDispatching.value) break;

    currentProcessingId.value = guest.id;

    let sender: any = null;
    if (dispatchStrategy.value === "round-robin") {
      sender = pool[senderIndex % pool.length];
      senderIndex++;
    } else {
      const senderId = resolveSenderForGuest(guest);
      if (senderId === "unassigned") {
        console.warn(`Skipping ${guest.leadName}: Group is unassigned.`);
        continue;
      }
      sender = config.value.senders.find((s) => s.id === senderId);
    }

    if (!sender) {
      continue;
    }

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
