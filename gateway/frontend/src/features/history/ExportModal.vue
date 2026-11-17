<!--
  내보내기 창 (화면설계안 v-rev3.js statExport())
  - 파일 형식: 엑셀 / CSV, 담을 내용, 열 미리보기(처음 3행), 파일 이름
  - 백엔드 GET /stats/export 는 엑셀을 골라도 지금은 CSV 를 줌 → 파일은 언제나 .csv (안내 문구로 알림)
  - 내려받기: 파일을 받아 PC 에 저장, 끝나면 알림
-->
<script setup>
import { ref, watch } from 'vue'
import { placeOf, shortTime } from './historyFilter'
import { exportStats, getStatsAlarms } from '@/api/stats'
import { toast } from '@/utils/toast'
import AppIcon from '@/components/AppIcon.vue'
import BaseModal from '@/components/BaseModal.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  /** 지금 조건 (API criteria) */
  criteria: { type: Object, required: true },
  /** 창 머리 설명 '5공장 · 2026-10-19 ~ 2026-11-17' */
  where: { type: String, default: '' },
  /** 지금 조건의 알림 수 */
  rowCount: { type: Number, default: 0 },
})

const emit = defineEmits(['close'])

const format = ref('xlsx')
const preview = ref([])
const busy = ref(false)
const fileName = () => `ArgOS_alarm_${props.criteria.from.replace(/-/g, '')}_${props.criteria.to.replace(/-/g, '')}.csv`

// 열 때마다 미리보기 3행
watch(
  () => props.open,
  async (open) => {
    if (!open) return
    busy.value = false
    preview.value = []
    try {
      preview.value = (await getStatsAlarms({ ...props.criteria, page: 0, size: 3 })).items
    } catch {
      preview.value = []
    }
  },
)

/** Blob → PC 에 저장 */
function save(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function download() {
  busy.value = true
  try {
    const { fileName: name, blob } = await exportStats(props.criteria, format.value)
    save(blob, name)
    toast(`${name} 파일을 저장했습니다.`)
    emit('close')
  } catch (error) {
    toast(error.message, { type: 'err' })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal" :duration="{ enter: 300, leave: 200 }">
      <BaseModal v-if="open" :width="1040" label="내보내기" @close="emit('close')">
        <div class="m-head">
          <h2>내보내기</h2>
          <span class="loc">{{ where }}</span>
          <button type="button" class="m-close" aria-label="닫기" @click="emit('close')"><AppIcon name="x" /></button>
        </div>

        <div class="body">
          <div class="m-sect">파일 형식</div>
          <div class="fmt" role="radiogroup" aria-label="파일 형식">
            <button type="button" role="radio" :aria-checked="format === 'xlsx'" :class="{ on: format === 'xlsx' }" @click="format = 'xlsx'">
              <AppIcon name="file" :size="22" />
              <span><b>엑셀 (.xlsx)</b><small>지금은 CSV 로 받습니다 (엑셀에서 바로 열림)</small></span>
            </button>
            <button type="button" role="radio" :aria-checked="format === 'csv'" :class="{ on: format === 'csv' }" @click="format = 'csv'">
              <AppIcon name="file" :size="22" />
              <span><b>CSV (.csv)</b><small>알림 이력 · 다른 시스템에 넣을 때</small></span>
            </button>
          </div>

          <div class="m-sect gap">담을 내용</div>
          <div class="sheet">
            <span class="bx"><AppIcon name="check" :size="11" /></span>
            <span><b>알림 이력</b><small>발생 건마다 한 줄</small></span>
            <span class="mono n">{{ rowCount }}행</span>
          </div>

          <div class="m-sect gap">열 구성 미리보기 <small>처음 3행</small></div>
          <div class="pv">
            <table>
              <thead>
                <tr>
                  <th>발생 시각</th><th>공장</th><th>공정</th><th>위치</th><th>센서</th><th>측정값</th><th>기준</th><th>단계</th><th>상태</th><th>체크리스트</th><th>조치 시간(분)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in preview" :key="r.id">
                  <td class="mono">{{ shortTime(r.raisedAt) }}</td>
                  <td>{{ placeOf(r.location).factory }}</td>
                  <td>{{ placeOf(r.location).process }}</td>
                  <td>{{ placeOf(r.location).equipment }}</td>
                  <td class="mono">{{ r.sensorTag }}</td>
                  <td class="mono">{{ r.value }} {{ r.unit }}</td>
                  <td class="mono">{{ r.threshold }}</td>
                  <td>{{ r.level === 'WARN' ? '주의' : '경보' }}</td>
                  <td>{{ r.status }}</td>
                  <td class="mono">{{ r.checklist ? `${r.checklist.doneCount}/${r.checklist.totalCount}` : '' }}</td>
                  <td class="mono">{{ r.actionMinutes ?? '' }}</td>
                </tr>
                <tr v-if="!preview.length">
                  <td colspan="11" class="none">조건에 맞는 알림이 없습니다</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="fn"><AppIcon name="download" :size="15" /><span class="mono">{{ fileName() }}</span></p>
        </div>

        <div class="m-actions foot">
          <button type="button" class="btn" @click="emit('close')">취소</button>
          <button type="button" class="btn btn-primary" :disabled="busy || !rowCount" @click="download">
            <span v-if="busy" class="m-spin" /><AppIcon v-else name="download" :size="16" />{{ busy ? '파일 만드는 중' : '내려받기' }}
          </button>
        </div>
      </BaseModal>
    </Transition>
  </Teleport>
</template>

<style scoped>
.body {
  padding: 20px 28px 0;
}

.gap {
  margin-top: 18px;
}

.m-sect {
  margin-bottom: 8px;
}

.fmt {
  display: flex;
  gap: 10px;
}

.fmt button {
  flex: 1;
  height: 62px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  text-align: left;
  cursor: pointer;
  transition: border-color var(--m-hover), background var(--m-hover);
}

.fmt button:hover {
  border-color: #93c5fd;
}

.fmt button.on {
  border: 2px solid var(--color-primary);
  padding: 0 15px;
  background: var(--color-primary-soft);
}

.fmt svg {
  color: var(--color-text-weak);
}

.fmt .on svg {
  color: var(--color-primary);
}

.fmt span,
.sheet span {
  display: flex;
  flex-direction: column;
}

.fmt small,
.sheet small {
  font-size: 12.5px;
  color: var(--color-text-weak);
}

.sheet {
  height: 54px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
}

.sheet .bx {
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  border-radius: 4px;
  background: var(--color-primary);
  color: #fff;
}

.sheet .n {
  margin-left: auto;
  flex-direction: row;
  color: var(--color-text-sub);
}

.pv {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.pv table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.pv th {
  height: 30px;
  padding: 0 8px;
  background: #e8f1e9;
  border-right: 1px solid #cfe3d2;
  font-weight: 600;
  color: #14532d;
  text-align: left;
  white-space: nowrap;
}

.pv td {
  height: 30px;
  padding: 0 8px;
  border-top: 1px solid #eef2f6;
  color: var(--color-text-sub);
  white-space: nowrap;
}

.pv .none {
  text-align: center;
  color: var(--color-text-weak);
}

.fn {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  font-size: 13px;
  color: var(--color-text-sub);
}

.foot {
  justify-content: flex-end;
  padding: 20px 28px 24px;
}

.foot .btn {
  height: 44px;
  padding: 0 20px;
}
</style>
