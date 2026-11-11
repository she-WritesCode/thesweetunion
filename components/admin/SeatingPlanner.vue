<template>
  <div class="space-y-3 text-slate-800">
    <!-- Header / stats -->
    <div
      class="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-lg border border-slate-200 shadow-xs"
    >
      <div class="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
        <div>
          <span class="text-2xl font-bold text-purple-900">{{ seatedSeats }}</span>
          <span class="text-slate-500"> / {{ totalSeats }} guests seated</span>
        </div>
        <div class="text-slate-600">
          <strong>{{ unseatedGuests.length }}</strong> parties still need a table
        </div>
        <div class="text-slate-500 text-xs">
          {{ tablesInUse }} of {{ tables.length }} tables in use · {{ freeSeats }} free seats
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span
          class="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-full transition-colors"
          :class="inflight > 0 ? 'bg-amber-50 text-amber-800' : 'text-slate-500'"
          aria-live="polite"
        >
          <template v-if="inflight > 0">
            <i class="w-3 h-3 border-2 border-amber-300 border-t-amber-700 rounded-full animate-spin"></i>Saving…
          </template>
          <template v-else-if="everSaved">✓ All changes saved</template>
        </span>
        <div class="inline-flex rounded border border-slate-300 overflow-hidden bg-white">
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
            :disabled="!undoStack.length"
            :title="undoStack.length ? `Undo: ${undoStack[undoStack.length - 1].label}  (Ctrl/⌘+Z)` : 'Nothing to undo'"
            @click="undo"
          >
            ↶ Undo<span v-if="undoStack.length" class="ml-1 text-slate-400 font-normal">{{ undoStack.length }}</span>
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-semibold border-l border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
            :disabled="!redoStack.length"
            :title="
              redoStack.length ? `Redo: ${redoStack[redoStack.length - 1].label}  (Ctrl/⌘+Shift+Z)` : 'Nothing to redo'
            "
            @click="redo"
          >
            ↷ Redo<span v-if="redoStack.length" class="ml-1 text-slate-400 font-normal">{{ redoStack.length }}</span>
          </button>
        </div>
        <button
          type="button"
          class="px-3 py-1.5 text-xs font-semibold rounded border border-purple-300 bg-purple-50 text-purple-900 hover:bg-purple-100"
          :disabled="!unseatedGuests.length"
          @click="
            autoOpen = !autoOpen;
            autoPlan = null;
          "
        >
          ✨ Auto-seat
        </button>
        <button
          type="button"
          class="px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 bg-white hover:bg-slate-50"
          :disabled="loading"
          @click="load"
        >
          {{ loading ? "Loading…" : "Refresh" }}
        </button>
        <button
          type="button"
          class="px-3 py-1.5 text-xs font-semibold rounded bg-purple-900 text-white hover:bg-purple-800"
          @click="printList"
        >
          Print seating list
        </button>
      </div>

      <!-- Overall progress -->
      <div class="basis-full">
        <div
          class="relative h-2.5 rounded-full bg-slate-100 overflow-hidden"
          role="progressbar"
          aria-label="Guests seated"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="percentSeated"
        >
          <div
            class="h-full rounded-full transition-all duration-700 ease-out"
            :class="percentSeated === 100 ? 'bg-gradient-to-r from-amber-300 to-amber-500' : 'bg-gradient-to-r from-purple-400 to-purple-800'"
            :style="{ width: percentSeated + '%' }"
          ></div>
          <i v-for="m in MILESTONES" :key="m" class="absolute top-0 h-full w-px bg-white/90" :style="{ left: m + '%' }"></i>
        </div>
        <div class="relative h-4 mt-0.5 text-[10px] text-slate-400">
          <span class="absolute left-0">{{ percentSeated }}% seated</span>
          <span
            v-for="m in MILESTONES"
            :key="m"
            class="absolute -translate-x-1/2 transition-colors"
            :class="percentSeated >= m ? 'text-purple-700 font-semibold' : ''"
            :style="{ left: m + '%' }"
          >
            {{ m }}%
          </span>
        </div>
      </div>
    </div>

    <div v-if="error" class="p-3 text-sm rounded-lg bg-red-50 border border-red-200 text-red-700">{{ error }}</div>

    <!-- Auto-seat panel -->
    <div v-if="autoOpen" class="p-3 bg-purple-50 rounded-lg border border-purple-200 space-y-2">
      <div class="flex flex-wrap items-end gap-2">
        <label class="text-xs font-semibold text-purple-900">
          Which guests?
          <select
            v-model="autoGroup"
            class="block mt-1 px-2 py-1.5 text-sm border border-purple-300 rounded bg-white font-normal"
            @change="autoPlan = null"
          >
            <option value="">All unseated groups</option>
            <option v-for="g in groupsWithUnseated" :key="g.name" :value="g.name">
              {{ g.name }} ({{ g.seats }} seats)
            </option>
          </select>
        </label>
        <button
          type="button"
          class="px-3 py-1.5 text-xs font-semibold rounded bg-purple-900 text-white hover:bg-purple-800"
          @click="planAutoSeat(autoGroup)"
        >
          Preview
        </button>
        <button type="button" class="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900" @click="autoOpen = false">
          Close
        </button>
      </div>
      <p class="text-[11px] text-purple-900/80">
        Keeps each group together on neighbouring tables, never splits a couple, and fills tables that already have free
        seats. Nothing is saved until you apply it, and you can undo afterwards.
      </p>
      <div v-if="autoPlan" class="text-sm space-y-2">
        <p>
          Will seat <strong>{{ autoPlan.parties }}</strong> parties (<strong>{{ autoPlan.seats }}</strong> guests)
          across <strong>{{ autoPlan.tablesUsed }}</strong> tables.
          <span v-if="autoPlan.unplaced.length" class="text-red-700">
            {{ autoPlan.unplaced.length }} part{{ autoPlan.unplaced.length > 1 ? "ies" : "y" }} won't fit.
          </span>
        </p>
        <button
          type="button"
          class="px-3 py-1.5 text-xs font-semibold rounded bg-emerald-700 text-white hover:bg-emerald-600 disabled:opacity-50"
          :disabled="!autoPlan.assignments.length"
          @click="applyAutoSeat"
        >
          Apply seating
        </button>
      </div>
    </div>

    <!-- Confetti (decorative) -->
    <canvas
      ref="confettiCanvas"
      class="fixed inset-0 w-full h-full pointer-events-none z-[70]"
      aria-hidden="true"
    ></canvas>

    <!-- Toasts -->
    <TransitionGroup
      name="sp-toast"
      tag="div"
      class="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none"
    >
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto flex items-center gap-3 max-w-sm px-4 py-2.5 rounded-xl text-sm shadow-lg"
        :class="
          t.kind === 'error'
            ? 'bg-red-600 text-white'
            : t.kind === 'party'
              ? 'bg-gradient-to-r from-purple-800 to-purple-600 text-white font-medium'
              : 'bg-slate-900 text-white'
        "
      >
        <span>{{ t.text }}</span>
        <button
          v-if="t.action"
          type="button"
          class="shrink-0 font-semibold text-amber-300 hover:text-amber-200 underline underline-offset-2"
          @click="
            t.action.fn();
            dismiss(t.id);
          "
        >
          {{ t.action.label }}
        </button>
      </div>
    </TransitionGroup>

    <!-- In-app confirmation (replaces the browser pop-up) -->
    <Transition name="sp-dialog">
      <div
        v-if="dialog"
        class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40"
        @click.self="resolveDialog(false)"
      >
        <div class="w-full max-w-sm p-5 bg-white rounded-2xl shadow-2xl space-y-3" role="alertdialog" aria-modal="true">
          <h3 class="text-base font-semibold text-slate-900">{{ dialog.title }}</h3>
          <p class="text-sm text-slate-600 leading-relaxed">{{ dialog.body }}</p>
          <div class="flex justify-end gap-2 pt-1">
            <button
              type="button"
              class="px-3 py-1.5 text-sm rounded-lg text-slate-600 hover:bg-slate-100"
              @click="resolveDialog(false)"
            >
              Cancel
            </button>
            <button
              type="button"
              class="px-3.5 py-1.5 text-sm font-semibold rounded-lg text-white"
              :class="dialog.tone === 'danger' ? 'bg-red-600 hover:bg-red-500' : 'bg-purple-900 hover:bg-purple-800'"
              @click="resolveDialog(true)"
            >
              {{ dialog.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <div class="grid gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
      <!-- Guest list -->
      <aside class="bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col max-h-[80vh]">
        <div class="p-3 space-y-2 border-b border-slate-200">
          <input
            v-model="search"
            type="search"
            placeholder="Search guests…"
            class="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
          <div class="flex gap-2">
            <select
              v-model="groupFilter"
              class="flex-1 min-w-0 px-2 py-1.5 text-xs border border-slate-300 rounded bg-white"
            >
              <option value="">All groups</option>
              <option v-for="g in groupNames" :key="g" :value="g">{{ g }}</option>
            </select>
            <div class="inline-flex rounded border border-slate-300 overflow-hidden text-xs">
              <button
                type="button"
                class="px-2.5 py-1.5"
                :class="view === 'unseated' ? 'bg-purple-900 text-white' : 'bg-white text-slate-600'"
                @click="view = 'unseated'"
              >
                Unseated
              </button>
              <button
                type="button"
                class="px-2.5 py-1.5 border-l border-slate-300"
                :class="view === 'all' ? 'bg-purple-900 text-white' : 'bg-white text-slate-600'"
                @click="view = 'all'"
              >
                All
              </button>
            </div>
          </div>
          <p class="text-[11px] text-slate-500 leading-snug">
            Drag a guest onto a table, or click a guest and then click a table. Couples are seated together.
          </p>
        </div>

        <div
          v-if="armedGuest"
          class="px-3 py-2 text-xs bg-amber-50 border-b border-amber-200 text-amber-900 flex items-center justify-between gap-2"
        >
          <span
            >Now click a table to seat <strong>{{ armedGuest.leadName }}</strong></span
          >
          <button type="button" class="underline" @click="armedId = null">Cancel</button>
        </div>

        <ul class="overflow-y-auto divide-y divide-slate-100">
          <li v-if="!visibleGuests.length" class="p-4 text-sm text-center text-slate-500">
            {{ loading ? "Loading guests…" : view === "unseated" ? "Everyone is seated 🎉" : "No guests match." }}
          </li>
          <li
            v-for="g in visibleGuests"
            :key="g.id"
            draggable="true"
            class="px-3 py-2 cursor-grab active:cursor-grabbing select-none hover:bg-purple-50"
            :class="armedId === g.id ? 'bg-amber-50 ring-1 ring-inset ring-amber-400' : ''"
            @dragstart="onDragStart($event, g)"
            @dragend="
              dragId = null;
              hoverTable = null;
            "
            @click="armedId = armedId === g.id ? null : g.id"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">
                  {{ g.leadName
                  }}<span v-if="g.hasSpouse" class="text-slate-500"> + {{ g.spouseName || "Partner" }}</span>
                </p>
                <p class="text-[11px] text-slate-500 truncate">{{ g.groupName || "No group" }}</p>
              </div>
              <div class="flex flex-col items-end gap-1 shrink-0">
                <i
                  v-if="isPending(g.id)"
                  class="w-3 h-3 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin"
                  title="Saving…"
                ></i>
                <span
                  class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  :class="g.seats === 2 ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'"
                >
                  {{ g.seats }} seat{{ g.seats > 1 ? "s" : "" }}
                </span>
                <button
                  v-if="g.tableNumber"
                  type="button"
                  class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                  title="Show this table"
                  @click.stop="selectedTable = g.tableNumber"
                >
                  Table {{ g.tableNumber
                  }}<template v-if="labelOf(g.tableNumber)"> · {{ labelOf(g.tableNumber) }}</template>
                </button>
              </div>
            </div>
          </li>
        </ul>
      </aside>

      <!-- Floor plan + table detail -->
      <section class="space-y-3 min-w-0">
        <div class="bg-white rounded-lg border border-slate-200 shadow-xs p-2 overflow-x-auto">
          <div class="flex flex-wrap items-center gap-3 px-1 pb-2 text-[11px] text-slate-600">
            <span class="inline-flex items-center gap-1"
              ><i class="w-3 h-3 rounded-full border border-slate-400 bg-slate-100"></i>Empty</span
            >
            <span class="inline-flex items-center gap-1"
              ><i class="w-3 h-3 rounded-full border border-purple-500 bg-purple-200"></i>Filling</span
            >
            <span class="inline-flex items-center gap-1"><i class="w-3 h-3 rounded-full bg-purple-800"></i>Full</span>
            <span class="inline-flex items-center gap-1"
              ><i class="w-3 h-3 rounded-full border border-red-500 bg-red-200"></i>Over capacity</span
            >
          </div>

          <svg
            :viewBox="`0 0 ${SEATING_VIEWBOX.w} ${SEATING_VIEWBOX.h}`"
            class="w-full min-w-[640px] h-auto"
            role="img"
            aria-label="Reception floor plan"
          >
            <rect x="15" y="62" width="1935" height="1176" fill="#fff" stroke="#0f172a" stroke-width="8" />

            <!-- Landmarks -->
            <g v-for="l in SEATING_LANDMARKS" :key="l.label">
              <rect
                :x="l.x"
                :y="l.y"
                :width="l.w"
                :height="l.h"
                :fill="l.tone === 'accent' ? '#d8b4ee' : '#fff'"
                :stroke="l.tone === 'accent' ? 'none' : '#64748b'"
                stroke-width="2"
              />
              <text
                :x="l.x + l.w / 2"
                :y="l.y + l.h / 2"
                text-anchor="middle"
                dominant-baseline="middle"
                font-size="30"
                fill="#1e293b"
                :transform="l.rotate ? `rotate(-90 ${l.x + l.w / 2} ${l.y + l.h / 2})` : undefined"
              >
                {{ l.label }}
              </text>
            </g>

            <!-- Tables -->
            <g
              v-for="t in tables"
              :key="t.number"
              :data-table="t.number"
              class="cursor-pointer"
              @click="onTableClick(t.number)"
              @dragover.prevent="hoverTable = t.number"
              @dragleave="hoverTable === t.number && (hoverTable = null)"
              @drop.prevent="onDrop(t.number)"
            >
              <title>
                Table {{ t.number }}{{ t.label ? ` · ${t.label}` : "" }} — {{ used(t) }}/{{ t.capacity }} seats
              </title>
              <!-- hit area -->
              <rect
                :x="t.x - (t.shape === 'round' ? 54 : (t.w || 0) / 2 + 6)"
                :y="t.y - (t.shape === 'round' ? 54 : 40)"
                :width="t.shape === 'round' ? 108 : (t.w || 0) + 12"
                :height="t.shape === 'round' ? 108 : 80"
                fill="transparent"
              />

              <template v-if="t.shape === 'round'">
                <circle
                  v-for="(c, i) in chairs(t)"
                  :key="i"
                  :cx="c.x"
                  :cy="c.y"
                  r="6"
                  class="sp-shape"
                  :fill="i < used(t) ? '#3b0764' : '#fff'"
                  stroke="#334155"
                  stroke-width="2"
                />
                <circle
                  :cx="t.x"
                  :cy="t.y"
                  r="32"
                  class="sp-shape"
                  :class="pendingTables.has(t.number) ? 'animate-pulse' : ''"
                  :fill="fillFor(t).fill"
                  :stroke="selectedTable === t.number || hoverTable === t.number ? '#f59e0b' : fillFor(t).stroke"
                  :stroke-width="selectedTable === t.number || hoverTable === t.number ? 6 : 3"
                />
              </template>
              <template v-else>
                <circle
                  v-for="(c, i) in chairs(t)"
                  :key="i"
                  :cx="c.x"
                  :cy="c.y"
                  r="7"
                  class="sp-shape"
                  :fill="i < used(t) ? '#3b0764' : '#fff'"
                  stroke="#334155"
                  stroke-width="2"
                />
                <rect
                  :x="t.x - (t.w || 0) / 2"
                  :y="t.y - 18"
                  :width="t.w"
                  height="36"
                  rx="4"
                  class="sp-shape"
                  :class="pendingTables.has(t.number) ? 'animate-pulse' : ''"
                  :fill="fillFor(t).fill"
                  :stroke="selectedTable === t.number || hoverTable === t.number ? '#f59e0b' : fillFor(t).stroke"
                  :stroke-width="selectedTable === t.number || hoverTable === t.number ? 7 : 3"
                />
              </template>

              <text
                :x="t.x"
                :y="t.y - 5"
                text-anchor="middle"
                dominant-baseline="middle"
                font-size="22"
                font-weight="700"
                :fill="fillFor(t).text"
                pointer-events="none"
              >
                {{ t.number }}
              </text>
              <text
                :x="t.x"
                :y="t.y + 12"
                text-anchor="middle"
                dominant-baseline="middle"
                font-size="13"
                :fill="fillFor(t).text"
                pointer-events="none"
              >
                {{ used(t) }}/{{ t.capacity }}
              </text>
            </g>
          </svg>
        </div>

        <!-- Selected table -->
        <div v-if="selected" class="bg-white rounded-lg border border-slate-200 shadow-xs p-3 space-y-3">
          <div class="flex items-center justify-between gap-2">
            <h3 class="font-semibold">
              Table {{ selected.number
              }}<span v-if="selected.label" class="font-normal text-slate-600"> · {{ selected.label }}</span>
              <span class="text-sm font-normal text-slate-500">
                · {{ used(selected) }} of {{ selected.capacity }} seats taken</span
              >
            </h3>
            <div class="flex items-center gap-2">
              <button
                v-if="selectedGuests.length"
                type="button"
                class="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50"
                @click="clearTable(selected.number)"
              >
                Empty table
              </button>
              <button
                type="button"
                class="text-xs px-2 py-1 text-slate-500 hover:text-slate-800"
                @click="selectedTable = null"
              >
                Close
              </button>
            </div>
          </div>

          <!-- Name + seats -->
          <div class="flex flex-wrap items-end gap-2 p-2 rounded bg-slate-50 border border-slate-200">
            <label class="text-[11px] font-semibold text-slate-600 flex-1 min-w-[140px]">
              Table name
              <input
                v-model="editLabel"
                type="text"
                maxlength="40"
                placeholder="e.g. Family, VIP"
                class="block w-full mt-1 px-2 py-1.5 text-sm font-normal border border-slate-300 rounded bg-white"
              />
            </label>
            <label class="text-[11px] font-semibold text-slate-600 w-20">
              Seats
              <input
                v-model.number="editCapacity"
                type="number"
                min="0"
                max="24"
                class="block w-full mt-1 px-2 py-1.5 text-sm font-normal border border-slate-300 rounded bg-white"
              />
            </label>
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-semibold rounded bg-purple-900 text-white hover:bg-purple-800 disabled:opacity-40"
              :disabled="!tableDirty || savingTable"
              @click="saveTable"
            >
              {{ savingTable ? "Saving…" : "Save" }}
            </button>
          </div>

          <!-- Seat a whole group here -->
          <div v-if="groupsWithUnseated.length" class="flex flex-wrap items-end gap-2">
            <label class="text-[11px] font-semibold text-slate-600 flex-1 min-w-[180px]">
              Seat a whole group here
              <select
                v-model="groupToSeat"
                class="block w-full mt-1 px-2 py-1.5 text-sm font-normal border border-slate-300 rounded bg-white"
              >
                <option value="">Choose a group…</option>
                <option v-for="g in groupsWithUnseated" :key="g.name" :value="g.name">
                  {{ g.name }} · {{ g.parties }} unseated ({{ g.seats }} seats)
                </option>
              </select>
            </label>
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-semibold rounded border border-purple-300 bg-purple-50 text-purple-900 hover:bg-purple-100 disabled:opacity-40"
              :disabled="!groupToSeat || selectedFree <= 0"
              @click="seatGroupHere"
            >
              Seat them ({{ Math.max(0, selectedFree) }} free)
            </button>
          </div>

          <!-- Move everyone / swap -->
          <div v-if="selectedGuests.length" class="flex flex-wrap items-end gap-2">
            <label class="text-[11px] font-semibold text-slate-600 flex-1 min-w-[170px]">
              Move everyone to…
              <select
                class="block w-full mt-1 px-2 py-1.5 text-sm font-normal border border-slate-300 rounded bg-white"
                @change="onMoveAll($event)"
              >
                <option value="">Choose a table…</option>
                <option v-for="o in moveOptions" :key="o.number" :value="o.number">{{ o.text }}</option>
              </select>
            </label>
            <label class="text-[11px] font-semibold text-slate-600 flex-1 min-w-[170px]">
              Swap with…
              <select
                class="block w-full mt-1 px-2 py-1.5 text-sm font-normal border border-slate-300 rounded bg-white"
                @change="onSwap($event)"
              >
                <option value="">Choose a table…</option>
                <option v-for="o in swapOptions" :key="o.number" :value="o.number">{{ o.text }}</option>
              </select>
            </label>
          </div>

          <p v-if="!selectedGuests.length" class="text-sm text-slate-500">No one is seated here yet.</p>
          <ul v-else class="divide-y divide-slate-100">
            <li
              v-for="g in selectedGuests"
              :key="g.id"
              draggable="true"
              class="py-1.5 flex items-center justify-between gap-2 text-sm cursor-grab active:cursor-grabbing"
              title="Drag onto another table to move them"
              @dragstart="onDragStart($event, g)"
              @dragend="
                dragId = null;
                hoverTable = null;
              "
            >
              <span class="truncate min-w-0">
                {{ g.leadName
                }}<span v-if="g.hasSpouse" class="text-slate-500"> + {{ g.spouseName || "Partner" }}</span>
                <span class="text-[11px] text-slate-500"> · {{ g.groupName || "No group" }}</span>
              </span>
              <span class="flex items-center gap-2 shrink-0">
                <i
                  v-if="isPending(g.id)"
                  class="w-3 h-3 border-2 border-purple-200 border-t-purple-700 rounded-full animate-spin"
                ></i>
                <select
                  class="max-w-[9.5rem] px-1.5 py-1 text-xs border border-slate-300 rounded bg-white disabled:opacity-40"
                  :disabled="isPending(g.id)"
                  aria-label="Move to another table"
                  @change="onMoveOne($event, g)"
                >
                  <option value="">Move to…</option>
                  <option v-for="o in moveOptions" :key="o.number" :value="o.number">{{ o.text }}</option>
                </select>
                <button
                  type="button"
                  class="text-xs text-red-600 hover:underline disabled:opacity-40"
                  :disabled="isPending(g.id)"
                  @click="assign([g], null)"
                >
                  Unseat
                </button>
              </span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import { adminAuthHeaders } from "~/utils/admin-auth";
import {
  SEATING_TABLES as BASE_TABLES,
  SEATING_LANDMARKS,
  SEATING_VIEWBOX,
  type SeatingTable,
} from "~~/config/seating";

interface TableView extends SeatingTable {
  label: string;
}

interface Guest {
  id: string;
  leadName: string;
  spouseName: string;
  hasSpouse: boolean;
  seats: number;
  groupName: string;
  tableNumber: number | null;
  checkedIn: boolean;
}

const guests = ref<Guest[]>([]);
const tableMeta = ref<Record<number, { label: string; capacity: number }>>({});
const tables = computed<TableView[]>(() =>
  BASE_TABLES.map((t) => ({
    ...t,
    capacity: tableMeta.value[t.number]?.capacity ?? t.capacity,
    label: tableMeta.value[t.number]?.label ?? "",
  })),
);
const labelOf = (n: number | null) => (n ? tables.value.find((t) => t.number === n)?.label || "" : "");
const loading = ref(false);
const error = ref<string | null>(null);
const search = ref("");
const groupFilter = ref("");
const view = ref<"unseated" | "all">("unseated");
const armedId = ref<string | null>(null);
const dragId = ref<string | null>(null);
const hoverTable = ref<number | null>(null);
const selectedTable = ref<number | null>(null);

// ── Toasts ────────────────────────────────────────────────────────────────
type Toast = { id: number; text: string; kind: "ok" | "error" | "party"; action?: { label: string; fn: () => void } };
const toasts = ref<Toast[]>([]);
let toastId = 0;
const dismiss = (id: number) => (toasts.value = toasts.value.filter((t) => t.id !== id));

function notify(text: string, kind: Toast["kind"] = "ok", action?: Toast["action"]) {
  const id = ++toastId;
  toasts.value = [...toasts.value, { id, text, kind, action }].slice(-4);
  setTimeout(() => dismiss(id), kind === "error" ? 6500 : kind === "party" ? 6000 : 4500);
}

// ── In-app confirmation dialog ────────────────────────────────────────────
const dialog = ref<null | { title: string; body: string; confirmText: string; tone: "danger" | "warn" }>(null);
let dialogResolve: ((v: boolean) => void) | null = null;

function askConfirm(opts: NonNullable<typeof dialog.value>): Promise<boolean> {
  return new Promise((resolve) => {
    dialogResolve = resolve;
    dialog.value = opts;
  });
}
function resolveDialog(v: boolean) {
  dialogResolve?.(v);
  dialogResolve = null;
  dialog.value = null;
}

async function load() {
  loading.value = true;
  error.value = null;
  celebrateReady = false; // groups that are already complete on load shouldn't trigger confetti
  try {
    const res: any = await $fetch(`/api/seating/state?_t=${Date.now()}`, { headers: adminAuthHeaders() });
    guests.value = res.guests || [];
    const meta: Record<number, { label: string; capacity: number }> = {};
    for (const t of res.tables || []) meta[t.number] = { label: t.label || "", capacity: t.capacity };
    tableMeta.value = meta;
  } catch (err: any) {
    error.value = err?.data?.message || err?.message || "Could not load guests.";
  } finally {
    loading.value = false;
    await nextTick();
    celebrateReady = true;
  }
}

// ── Derived data ──────────────────────────────────────────────────────────
const seatsByTable = computed(() => {
  const map = new Map<number, number>();
  for (const g of guests.value) {
    if (g.tableNumber) map.set(g.tableNumber, (map.get(g.tableNumber) || 0) + g.seats);
  }
  return map;
});
const used = (t: SeatingTable) => seatsByTable.value.get(t.number) || 0;

const totalSeats = computed(() => guests.value.reduce((s, g) => s + g.seats, 0));
const seatedSeats = computed(() => guests.value.filter((g) => g.tableNumber).reduce((s, g) => s + g.seats, 0));
const unseatedGuests = computed(() => guests.value.filter((g) => !g.tableNumber));
const tablesInUse = computed(() => tables.value.filter((t) => used(t) > 0).length);
const freeSeats = computed(() => tables.value.reduce((s, t) => s + Math.max(0, t.capacity - used(t)), 0));

const groupNames = computed(() =>
  Array.from(new Set(guests.value.map((g) => g.groupName).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
);

const visibleGuests = computed(() => {
  const q = search.value.trim().toLowerCase();
  return guests.value.filter((g) => {
    if (view.value === "unseated" && g.tableNumber) return false;
    if (groupFilter.value && g.groupName !== groupFilter.value) return false;
    if (!q) return true;
    return `${g.leadName} ${g.spouseName} ${g.groupName}`.toLowerCase().includes(q);
  });
});

const armedGuest = computed(() => guests.value.find((g) => g.id === armedId.value) || null);
const selected = computed(() => tables.value.find((t) => t.number === selectedTable.value) || null);
const selectedGuests = computed(() => guests.value.filter((g) => g.tableNumber === selectedTable.value));

// ── Table rendering ───────────────────────────────────────────────────────
function fillFor(t: SeatingTable) {
  const n = used(t);
  if (n > t.capacity) return { fill: "#fecaca", stroke: "#dc2626", text: "#7f1d1d" };
  if (n === t.capacity) return { fill: "#6b21a8", stroke: "#3b0764", text: "#ffffff" };
  if (n > 0) return { fill: "#e9d5ff", stroke: "#a855f7", text: "#3b0764" };
  return { fill: "#f1f5f9", stroke: "#94a3b8", text: "#334155" };
}

function chairs(t: SeatingTable) {
  if (t.shape === "round") {
    const n = Math.min(t.capacity, 24);
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      return { x: t.x + Math.cos(a) * 44, y: t.y + Math.sin(a) * 44 };
    });
  }
  const cap = Math.min(t.capacity, 24);
  const perSide = Math.max(1, Math.ceil(cap / 2));
  const w = t.w || 108;
  const xs = (i: number) => t.x - w / 2 + ((i + 0.5) * w) / perSide;
  const top = Array.from({ length: perSide }, (_, i) => ({ x: xs(i), y: t.y - 28 }));
  const bottom = Array.from({ length: Math.max(0, cap - perSide) }, (_, i) => ({ x: xs(i), y: t.y + 28 }));
  return [...top, ...bottom];
}

// ── Assigning ─────────────────────────────────────────────────────────────
function onDragStart(e: DragEvent, g: Guest) {
  dragId.value = g.id;
  e.dataTransfer?.setData("text/plain", g.id);
  if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
}

function onDrop(tableNumber: number) {
  const g = guests.value.find((x) => x.id === dragId.value);
  hoverTable.value = null;
  dragId.value = null;
  if (g) assign([g], tableNumber);
}

function onTableClick(tableNumber: number) {
  if (armedGuest.value) {
    const g = armedGuest.value;
    armedId.value = null;
    assign([g], tableNumber);
  }
  selectedTable.value = tableNumber;
}

type Assignment = { guests: Guest[]; tableNumber: number | null };
type Change = { id: string; from: number | null; to: number | null };
type Meta = { label: string; capacity: number };
type HistoryEntry =
  | { kind: "seat"; label: string; changes: Change[] }
  | { kind: "table"; label: string; number: number; from: Meta; to: Meta };

// Session history: lives in memory for as long as this page stays open.
const MAX_HISTORY = 300;
// shallowRef keeps entries as plain objects so the identity checks below work.
const undoStack = shallowRef<HistoryEntry[]>([]);
const redoStack = shallowRef<HistoryEntry[]>([]);

// Saving state — seating is applied instantly, then saved in the background.
const inflight = ref(0);
const everSaved = ref(false);
const pendingIds = ref<Record<string, number>>({});
const isPending = (id: string) => (pendingIds.value[id] || 0) > 0;
const pendingTables = computed(
  () => new Set(guests.value.filter((g) => g.tableNumber && isPending(g.id)).map((g) => g.tableNumber as number)),
);
function markPending(ids: string[], delta: 1 | -1) {
  const next = { ...pendingIds.value };
  for (const id of ids) {
    next[id] = Math.max(0, (next[id] || 0) + delta);
    if (!next[id]) delete next[id];
  }
  pendingIds.value = next;
}

// Saves run one after another so rapid actions (or undo/redo) can't race each other.
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const p = queue.then(fn);
  queue = p.catch(() => undefined);
  return p;
}

const guestById = (id: string) => guests.value.find((g) => g.id === id);

/** Apply seating instantly, save in the background, roll back if the save fails. */
async function applySeats(targets: { id: string; table: number | null }[], force: boolean): Promise<boolean> {
  const ids = targets.map((t) => t.id);
  const previous = targets.map((t) => ({ id: t.id, table: guestById(t.id)?.tableNumber ?? null }));
  const setLocal = (list: { id: string; table: number | null }[]) => {
    for (const x of list) {
      const g = guestById(x.id);
      if (g) g.tableNumber = x.table;
    }
  };

  const dest = [...targets].reverse().find((t) => t.table != null)?.table;
  if (dest != null) lastSeatedTable = dest;
  setLocal(targets);
  markPending(ids, 1);
  inflight.value++;
  try {
    const byTable = new Map<number | null, string[]>();
    for (const t of targets) byTable.set(t.table, [...(byTable.get(t.table) || []), t.id]);
    await enqueue(() =>
      $fetch("/api/seating/assign", {
        method: "POST",
        headers: adminAuthHeaders(),
        body: { assignments: [...byTable].map(([tableNumber, guestIds]) => ({ guestIds, tableNumber })), force },
      }),
    );
    everSaved.value = true;
    return true;
  } catch (err: any) {
    setLocal(previous);
    notify(err?.data?.message || err?.message || "Couldn't save that change, so nothing was changed.", "error");
    return false;
  } finally {
    markPending(ids, -1);
    inflight.value--;
  }
}

/** Seats that would not fit at a destination table (checked here, before anything is sent). */
function overflow(changes: Change[]) {
  const moving = new Set(changes.map((c) => c.id));
  const needed = new Map<number, number>();
  for (const c of changes) {
    if (c.to != null) needed.set(c.to, (needed.get(c.to) || 0) + (guestById(c.id)?.seats || 1));
  }
  const out: { table: number; free: number; needed: number }[] = [];
  for (const [n, need] of needed) {
    const cap = tables.value.find((t) => t.number === n)?.capacity ?? 0;
    const taken = guests.value
      .filter((g) => g.tableNumber === n && !moving.has(g.id))
      .reduce((sum, g) => sum + g.seats, 0);
    if (need > cap - taken) out.push({ table: n, free: Math.max(0, cap - taken), needed: need });
  }
  return out;
}

function pushHistory(entry: HistoryEntry) {
  undoStack.value = [...undoStack.value, entry].slice(-MAX_HISTORY);
  redoStack.value = [];
}
function dropFromHistory(entry: HistoryEntry) {
  undoStack.value = undoStack.value.filter((e) => e !== entry);
  redoStack.value = redoStack.value.filter((e) => e !== entry);
}

/** One undoable seating action (single guest, a whole group, or an auto-seat). */
async function commit(label: string, changes: Change[]): Promise<boolean> {
  const real = changes.filter((c) => c.from !== c.to);
  if (!real.length) return false;

  let force = false;
  const over = overflow(real)[0];
  if (over) {
    const ok = await askConfirm({
      title: `Table ${over.table} is full`,
      body: `It has ${over.free} free seat${over.free === 1 ? "" : "s"} and this needs ${over.needed}. You can still seat them, and the table will turn red so you can sort it out later.`,
      confirmText: "Seat anyway",
      tone: "warn",
    });
    if (!ok) return false;
    force = true;
  }

  const entry: HistoryEntry = { kind: "seat", label, changes: real };
  pushHistory(entry);
  const saved = await applySeats(
    real.map((c) => ({ id: c.id, table: c.to })),
    force,
  );
  if (!saved) {
    dropFromHistory(entry);
    return false;
  }
  notify(label, "ok", { label: "Undo", fn: () => undoStack.value[undoStack.value.length - 1] === entry && undo() });
  return true;
}

function describe(list: Guest[]) {
  return list.length <= 2 ? list.map((g) => g.leadName).join(" & ") : `${list.length} parties`;
}

function assign(list: Guest[], tableNumber: number | null, label?: string) {
  const text = label || (tableNumber ? `${describe(list)} → Table ${tableNumber}` : `${describe(list)} unseated`);
  return commit(
    text,
    list.map((g) => ({ id: g.id, from: g.tableNumber, to: tableNumber })),
  );
}

function commitAssignments(assignments: Assignment[], label: string) {
  return commit(
    label,
    assignments.flatMap((a) => a.guests.map((g) => ({ id: g.id, from: g.tableNumber, to: a.tableNumber }))),
  );
}

// Table name / seat-count changes are part of the same history.
async function applyTableMeta(number: number, to: Meta): Promise<boolean> {
  const t = tables.value.find((x) => x.number === number);
  const previous: Meta = { label: t?.label || "", capacity: t?.capacity ?? 0 };
  tableMeta.value = { ...tableMeta.value, [number]: to };
  inflight.value++;
  try {
    await enqueue(() =>
      $fetch("/api/seating/settings", {
        method: "POST",
        headers: adminAuthHeaders(),
        body: { number, label: to.label, capacity: to.capacity },
      }),
    );
    everSaved.value = true;
    return true;
  } catch (err: any) {
    tableMeta.value = { ...tableMeta.value, [number]: previous };
    notify(err?.data?.message || err?.message || "Could not save table.", "error");
    return false;
  } finally {
    inflight.value--;
  }
}

function replay(entry: HistoryEntry, dir: "undo" | "redo"): Promise<boolean> {
  if (entry.kind === "seat") {
    // Restoring an earlier state is always allowed, even if it leaves a table over capacity.
    return applySeats(
      entry.changes.map((c) => ({ id: c.id, table: dir === "undo" ? c.from : c.to })),
      true,
    );
  }
  return applyTableMeta(entry.number, dir === "undo" ? entry.from : entry.to);
}

async function undo() {
  const entry = undoStack.value[undoStack.value.length - 1];
  if (!entry) return;
  undoStack.value = undoStack.value.slice(0, -1);
  redoStack.value = [...redoStack.value, entry];
  if (await replay(entry, "undo")) {
    notify(`Undid: ${entry.label}`, "ok", {
      label: "Redo",
      fn: () => redoStack.value[redoStack.value.length - 1] === entry && redo(),
    });
  } else {
    redoStack.value = redoStack.value.filter((e) => e !== entry);
    undoStack.value = [...undoStack.value, entry];
  }
}

async function redo() {
  const entry = redoStack.value[redoStack.value.length - 1];
  if (!entry) return;
  redoStack.value = redoStack.value.slice(0, -1);
  undoStack.value = [...undoStack.value, entry];
  if (await replay(entry, "redo")) {
    notify(`Redid: ${entry.label}`);
  } else {
    undoStack.value = undoStack.value.filter((e) => e !== entry);
    redoStack.value = [...redoStack.value, entry];
  }
}

// Ctrl/⌘+Z to undo, Ctrl/⌘+Shift+Z (or Ctrl+Y) to redo — unless you're typing in a field.
function onKey(e: KeyboardEvent) {
  if (dialog.value) {
    if (e.key === "Escape") resolveDialog(false);
    return;
  }
  const el = e.target as HTMLElement | null;
  if (el && (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable)) return;
  if (!(e.metaKey || e.ctrlKey)) return;
  const k = e.key.toLowerCase();
  if (k === "z" && !e.shiftKey) {
    e.preventDefault();
    undo();
  } else if ((k === "z" && e.shiftKey) || k === "y") {
    e.preventDefault();
    redo();
  }
}

// Don't let the tab close while a save is still running.
function onBeforeUnload(e: BeforeUnloadEvent) {
  if (inflight.value > 0) {
    e.preventDefault();
    e.returnValue = "";
  }
}

// ── Move people between tables (no unseating needed) ──────────────────────
const tableText = (t: TableView, extra = "") => `Table ${t.number}${t.label ? ` · ${t.label}` : ""} · ${extra}`;
const moveOptions = computed(() =>
  tables.value
    .filter((t) => t.number !== selectedTable.value)
    .map((t) => {
      const free = t.capacity - used(t);
      return { number: t.number, text: tableText(t, free > 0 ? `${free} free` : "full") };
    }),
);
const swapOptions = computed(() =>
  tables.value
    .filter((t) => t.number !== selectedTable.value && used(t) > 0)
    .map((t) => ({ number: t.number, text: tableText(t, `${used(t)} seated`) })),
);
const guestsAt = (n: number | null) => guests.value.filter((g) => g.tableNumber === n);

function pickedTable(e: Event): number | null {
  const el = e.target as HTMLSelectElement;
  const n = Number(el.value);
  el.value = ""; // reset so the same table can be chosen again later
  return Number.isFinite(n) && n > 0 ? n : null;
}

function onMoveOne(e: Event, g: Guest) {
  const to = pickedTable(e);
  if (to) assign([g], to);
}

async function onMoveAll(e: Event) {
  const to = pickedTable(e);
  const from = selectedTable.value;
  if (!to || !from) return;
  const list = guestsAt(from);
  if (!list.length) return;
  if (await assign(list, to, `Moved everyone from Table ${from} → Table ${to}`)) selectedTable.value = to;
}

async function onSwap(e: Event) {
  const other = pickedTable(e);
  const from = selectedTable.value;
  if (!other || !from) return;
  await commit(`Swapped Table ${from} ↔ Table ${other}`, [
    ...guestsAt(from).map((g) => ({ id: g.id, from, to: other })),
    ...guestsAt(other).map((g) => ({ id: g.id, from: other, to: from })),
  ]);
}

// ── Seat a whole group at the selected table ──────────────────────────────
const groupToSeat = ref("");
const groupsWithUnseated = computed(() => {
  const map = new Map<string, { name: string; parties: number; seats: number }>();
  for (const g of unseatedGuests.value) {
    const name = g.groupName || "No group";
    const e = map.get(name) || { name, parties: 0, seats: 0 };
    e.parties++;
    e.seats += g.seats;
    map.set(name, e);
  }
  return [...map.values()].sort((a, b) => b.seats - a.seats);
});

const selectedFree = computed(() => (selected.value ? selected.value.capacity - used(selected.value) : 0));

async function seatGroupHere() {
  const t = selected.value;
  if (!t || !groupToSeat.value) return;
  const parties = unseatedGuests.value
    .filter((g) => (g.groupName || "No group") === groupToSeat.value)
    .sort((a, b) => b.seats - a.seats);
  let free = selectedFree.value;
  const fit: Guest[] = [];
  for (const p of parties) {
    if (p.seats <= free) {
      fit.push(p);
      free -= p.seats;
    }
  }
  if (!fit.length) return notify(`No room at Table ${t.number} for ${groupToSeat.value}.`, "error");
  const left = parties.length - fit.length;
  await assign(
    fit,
    t.number,
    `${fit.length} ${groupToSeat.value} part${fit.length > 1 ? "ies" : "y"} → Table ${t.number}` +
      (left ? ` (${left} didn't fit)` : ""),
  );
}

// ── Table name / seat count editor ────────────────────────────────────────
const editLabel = ref("");
const editCapacity = ref<number>(0);
const savingTable = ref(false);
watch(
  selected,
  (t) => {
    editLabel.value = t?.label || "";
    editCapacity.value = t?.capacity ?? 0;
    groupToSeat.value = "";
  },
  { immediate: true },
);
const tableDirty = computed(
  () =>
    !!selected.value &&
    (editLabel.value !== selected.value.label || Number(editCapacity.value) !== selected.value.capacity),
);

async function saveTable() {
  const t = selected.value;
  if (!t) return;
  const from: Meta = { label: t.label, capacity: t.capacity };
  const to: Meta = { label: editLabel.value.trim(), capacity: Math.floor(Number(editCapacity.value)) };
  if (!Number.isFinite(to.capacity) || to.capacity < 0 || to.capacity > 24) {
    return notify("Seats must be between 0 and 24.", "error");
  }
  const entry: HistoryEntry = { kind: "table", label: `Table ${t.number} updated`, number: t.number, from, to };
  pushHistory(entry);
  savingTable.value = true;
  const ok = await applyTableMeta(t.number, to);
  savingTable.value = false;
  if (!ok) return dropFromHistory(entry);
  notify(entry.label, "ok", {
    label: "Undo",
    fn: () => undoStack.value[undoStack.value.length - 1] === entry && undo(),
  });
}

// ── Auto-seat by group ────────────────────────────────────────────────────
const autoOpen = ref(false);
const autoGroup = ref("");
const autoPlan = ref<null | {
  assignments: Assignment[];
  parties: number;
  seats: number;
  tablesUsed: number;
  unplaced: Guest[];
}>(null);

function planAutoSeat(onlyGroup: string) {
  const free = new Map(tables.value.map((t) => [t.number, t.capacity - used(t)]));
  const pos = new Map(tables.value.map((t) => [t.number, t]));
  const dist = (a: number, b: number) => {
    const A = pos.get(a)!;
    const B = pos.get(b)!;
    return Math.hypot(A.x - B.x, A.y - B.y);
  };

  const byGroup = new Map<string, Guest[]>();
  for (const g of unseatedGuests.value) {
    const name = g.groupName || "No group";
    if (onlyGroup && name !== onlyGroup) continue;
    byGroup.set(name, [...(byGroup.get(name) || []), g]);
  }
  const groups = [...byGroup.entries()].sort(
    (a, b) => b[1].reduce((s, g) => s + g.seats, 0) - a[1].reduce((s, g) => s + g.seats, 0),
  );

  const placed = new Map<number, Guest[]>();
  const unplaced: Guest[] = [];

  for (const [name, parties] of groups) {
    // Tables this group already sits at (so stragglers join their own people)
    const own = guests.value
      .filter((g) => g.tableNumber && (g.groupName || "No group") === name)
      .map((g) => g.tableNumber!);
    let anchor: number | null = own.length ? own[own.length - 1] : null;
    let remaining = parties.reduce((s, g) => s + g.seats, 0);

    for (const party of [...parties].sort((a, b) => b.seats - a.seats)) {
      const candidates = [...free].filter(([, f]) => f >= party.seats).map(([n]) => n);
      if (!candidates.length) {
        unplaced.push(party);
        continue;
      }
      let pick: number;
      if (anchor !== null) {
        pick = candidates.sort((a, b) => dist(a, anchor!) - dist(b, anchor!) || a - b)[0];
      } else {
        const roomy = candidates.filter((n) => free.get(n)! >= remaining);
        pick = roomy.length
          ? roomy.sort((a, b) => free.get(a)! - free.get(b)! || a - b)[0] // tightest table that holds everyone
          : candidates.sort((a, b) => free.get(b)! - free.get(a)! || a - b)[0]; // else the emptiest
      }
      free.set(pick, free.get(pick)! - party.seats);
      placed.set(pick, [...(placed.get(pick) || []), party]);
      remaining -= party.seats;
      anchor = pick;
    }
  }

  const assignments = [...placed].map(([tableNumber, gs]) => ({ guests: gs, tableNumber }));
  autoPlan.value = {
    assignments,
    parties: assignments.reduce((s, a) => s + a.guests.length, 0),
    seats: assignments.reduce((s, a) => s + a.guests.reduce((x, g) => x + g.seats, 0), 0),
    tablesUsed: assignments.length,
    unplaced,
  };
}

async function applyAutoSeat() {
  const plan = autoPlan.value;
  if (!plan || !plan.assignments.length) return;
  if (
    await commitAssignments(plan.assignments, `Auto-seated ${plan.parties} parties across ${plan.tablesUsed} tables`)
  ) {
    autoPlan.value = null;
    autoOpen.value = false;
  }
}

async function clearTable(tableNumber: number) {
  const list = guests.value.filter((g) => g.tableNumber === tableNumber);
  if (!list.length) return;
  const people = list.reduce((sum, g) => sum + g.seats, 0);
  const ok = await askConfirm({
    title: `Empty Table ${tableNumber}?`,
    body: `${list.length} part${list.length > 1 ? "ies" : "y"} (${people} guest${people > 1 ? "s" : ""}) will go back to the unseated list. You can undo this afterwards.`,
    confirmText: "Empty table",
    tone: "danger",
  });
  if (ok) assign(list, null, `Emptied Table ${tableNumber}`);
}

// ── Progress milestones ───────────────────────────────────────────────────
const MILESTONES = [25, 50, 75];
const percentSeated = computed(() =>
  totalSeats.value ? Math.floor((seatedSeats.value * 100) / totalSeats.value) : 0,
);
const MILESTONE_TEXT: Record<number, string> = {
  25: "🎈 A quarter of your guests are seated.",
  50: "🎉 Halfway there! Half the guest list has a seat.",
  75: "✨ Three quarters done. The finish line is in sight!",
};
const reachedMilestones = new Set<number>();

watch(percentSeated, (pct) => {
  const passed = MILESTONES.filter((m) => pct >= m);
  if (!celebrateReady) {
    passed.forEach((m) => reachedMilestones.add(m)); // already past these when the page loaded
    return;
  }
  for (const m of [...reachedMilestones]) if (!passed.includes(m)) reachedMilestones.delete(m); // dropped back (undo)
  const fresh = passed.filter((m) => !reachedMilestones.has(m));
  fresh.forEach((m) => reachedMilestones.add(m));
  // If one action jumped over several (e.g. auto-seat), mention only the highest.
  // 100% is celebrated by the "everyone is seated" finale below.
  if (fresh.length) notify(MILESTONE_TEXT[fresh[fresh.length - 1]], "party");
});

// ── Celebrations 🎉 ───────────────────────────────────────────────────────
const confettiCanvas = ref<HTMLCanvasElement | null>(null);
const ALL_SEATED = "__all__";
const celebrated = new Set<string>();
let celebrateReady = false;
let lastSeatedTable: number | null = null;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vr: number;
  color: string;
  life: number;
};
const CONFETTI_COLORS = ["#6b21a8", "#a855f7", "#d8b4ee", "#d4af37", "#fce8b3", "#16a34a", "#86efac", "#ffffff"];
let particles: Particle[] = [];
let confettiRaf = 0;

function fireConfetti(count: number, origins: { x: number; y: number }[]) {
  const canvas = confettiCanvas.value;
  if (!canvas || typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  for (const o of origins) {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1; // mostly upward fan
      const speed = 5 + Math.random() * 9;
      particles.push({
        x: o.x * dpr,
        y: o.y * dpr,
        vx: Math.cos(angle) * speed * dpr,
        vy: Math.sin(angle) * speed * dpr,
        w: (5 + Math.random() * 6) * dpr,
        h: (3 + Math.random() * 5) * dpr,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.35,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        life: 110 + Math.random() * 70,
      });
    }
  }
  if (confettiRaf) return;

  const tick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = particles.filter((p) => p.life > 0 && p.y < canvas.height + 40);
    for (const p of particles) {
      p.vy += 0.22 * dpr; // gravity
      p.vx *= 0.992;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life--;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.min(1, p.life / 40);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (particles.length) {
      confettiRaf = requestAnimationFrame(tick);
    } else {
      confettiRaf = 0;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };
  confettiRaf = requestAnimationFrame(tick);
}

/** Screen position of a table on the floor plan (falls back to the middle of the screen). */
function tableScreenPos(n: number | null) {
  const el = n != null ? (document.querySelector(`[data-table="${n}"]`) as SVGGraphicsElement | null) : null;
  if (el) {
    const r = el.getBoundingClientRect();
    if (r.width) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return { x: window.innerWidth / 2, y: window.innerHeight * 0.55 };
}

// A group counts as "done" once every party in it has a table (groups of 2+ parties only).
const groupProgress = computed(() => {
  const map = new Map<string, { parties: number; seated: number }>();
  for (const g of guests.value) {
    if (!g.groupName) continue;
    const e = map.get(g.groupName) || { parties: 0, seated: 0 };
    e.parties++;
    if (g.tableNumber) e.seated++;
    map.set(g.groupName, e);
  }
  return map;
});

const everyoneSeated = computed(() => guests.value.length > 1 && guests.value.every((g) => g.tableNumber));

watch([groupProgress, everyoneSeated], () => {
  const complete = new Set<string>();
  for (const [name, e] of groupProgress.value) if (e.parties >= 2 && e.seated === e.parties) complete.add(name);
  if (everyoneSeated.value) complete.add(ALL_SEATED);

  if (!celebrateReady) {
    complete.forEach((n) => celebrated.add(n)); // already finished when the page loaded
    return;
  }
  for (const n of [...celebrated]) if (!complete.has(n)) celebrated.delete(n); // un-finished → can celebrate again
  const fresh = [...complete].filter((n) => !celebrated.has(n));
  if (!fresh.length) return;
  fresh.forEach((n) => celebrated.add(n));

  if (fresh.includes(ALL_SEATED)) {
    notify("🎉 Everyone has a seat! The whole guest list is done.", "party");
    const w = window.innerWidth;
    const h = window.innerHeight;
    fireConfetti(90, [
      { x: w * 0.12, y: h },
      { x: w * 0.88, y: h },
      { x: w / 2, y: h * 0.9 },
    ]);
    return;
  }
  notify(`🎉 ${fresh.join(" & ")}: everyone is seated!`, "party");
  fireConfetti(70, [tableScreenPos(lastSeatedTable)]);
});

// ── Print ─────────────────────────────────────────────────────────────────
function printList() {
  const rows = tables.value
    .map((t) => {
      const at = guests.value.filter((g) => g.tableNumber === t.number);
      if (!at.length) return "";
      const names = at
        .map((g) => `<li>${esc(g.leadName)}${g.hasSpouse ? ` + ${esc(g.spouseName || "Partner")}` : ""}</li>`)
        .join("");
      return `<section><h2>Table ${t.number}${t.label ? ` · ${esc(t.label)}` : ""} <small>${used(t)}/${t.capacity}</small></h2><ul>${names}</ul></section>`;
    })
    .join("");
  const unseated = unseatedGuests.value
    .map((g) => `<li>${esc(g.leadName)}${g.hasSpouse ? ` + ${esc(g.spouseName || "Partner")}` : ""}</li>`)
    .join("");
  const w = window.open("", "_blank");
  if (!w) return notify("Allow pop-ups to print.", "error");
  w.document.write(`<!doctype html><title>Seating list</title>
    <style>body{font:14px Georgia,serif;margin:24px;columns:3;column-gap:24px}
    section{break-inside:avoid;margin:0 0 16px}h2{font-size:15px;margin:0 0 4px;border-bottom:1px solid #999}
    small{font-weight:normal;color:#666}ul{margin:0;padding-left:16px}h1{column-span:all;font-size:20px}</style>
    <h1>The Sweet Union · Seating list</h1>${rows}
    ${unseated ? `<section><h2>Not yet seated</h2><ul>${unseated}</ul></section>` : ""}`);
  w.document.close();
  w.print();
}
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

onMounted(() => {
  load();
  window.addEventListener("keydown", onKey);
  window.addEventListener("beforeunload", onBeforeUnload);
});
onBeforeUnmount(() => {
  cancelAnimationFrame(confettiRaf);
  window.removeEventListener("keydown", onKey);
  window.removeEventListener("beforeunload", onBeforeUnload);
});
</script>

<style scoped>
.sp-shape {
  transition:
    fill 0.35s ease,
    stroke 0.25s ease,
    stroke-width 0.2s ease;
}
.sp-toast-enter-active,
.sp-toast-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.sp-toast-enter-from,
.sp-toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
.sp-toast-move {
  transition: transform 0.25s ease;
}
.sp-dialog-enter-active,
.sp-dialog-leave-active {
  transition: opacity 0.2s ease;
}
.sp-dialog-enter-active > div,
.sp-dialog-leave-active > div {
  transition: transform 0.2s ease;
}
.sp-dialog-enter-from,
.sp-dialog-leave-to {
  opacity: 0;
}
.sp-dialog-enter-from > div,
.sp-dialog-leave-to > div {
  transform: scale(0.97);
}
</style>
