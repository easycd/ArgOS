<!--
  주의 상세 · 체크리스트 전송 창 (화면설계안 js/v-modals.js mWarnDetail(), 화면설계서 C2)
  - 왼쪽: 발생 원인(문장·기준 띠) / 전류 추이(최근 40분) / 예상 원인 / '센서 데이터 · 열화상 확인' 단추
  - 오른쪽: 조치 체크리스트(빼기·추가) / 전송 대상(공정 담당자) / 닫기 · 공정 담당자 앱으로 전송
  - 데이터: GET /alarms/{id}/detail, GET /checklist-templates, GET /processes/{id}/workers
  - 전송: POST /checklists → '보내는 중' → 알림 띠 → 창 닫힘 (상단 바에 체크리스트 진행이 나타남)
  - 이미 보낸 알림이면 항목을 고칠 수 없고 단추는 '전송 완료'
-->
<script setup>
import { onMounted, ref } from 'vue'
import ChecklistEditor from './ChecklistEditor.vue'
import MiniTrend from './MiniTrend.vue'
import WarnCause from './WarnCause.vue'
import WorkerPicker from './WorkerPicker.vue'
import { getAlarmDetail } from '@/api/alarms'
import { getChecklistTemplate, getProcessWorkers, sendChecklist } from '@/api/checklists'
import AppIcon from '@/components/AppIcon.vue'
import BaseModal from '@/components/BaseModal.vue'
import { useAlertStore } from '@/stores/alert'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/utils/toast'

const props = defineProps({
  alarmId: { type: Number, required: true },
})

const alert = useAlertStore()
const auth = useAuthStore()

const detail = ref(null)
const items = ref([])
const templateId = ref(null)
const workers = ref([])
const assigneeId = ref(null)
const errorMessage = ref('')

onMounted(async () => {
  try {
    const d = await getAlarmDetail(props.alarmId)
    const [template, list] = await Promise.all([
      getChecklistTemplate({ equipmentType: d.equipmentType, sensorType: d.sensorType }),
      getProcessWorkers(d.processId),
    ])
    detail.value = d
    items.value = [...template.items]
    templateId.value = template.templateId
    workers.value = list
    // 기본 선택: 근무 중인 첫 번째 담당자 (화면설계서: 근무 중이고 진행 건이 가장 적은 사람 → 진행 건 수는 API 에 없음)
    assigneeId.value = list.find((w) => w.onDuty)?.id ?? list[0]?.id ?? null
  } catch (error) {
    errorMessage.value = error.message
  }
})

/** 이미 보낸 알림 (조치 중) */
const sent = () => detail.value?.status === 'ACTING'

const sending = ref(false)

async function send() {
  sending.value = true
  try {
    await sendChecklist({
      alarmId: props.alarmId,
      templateId: templateId.value,
      assigneeId: assigneeId.value,
      items: items.value,
      sentBy: auth.user?.name,
    })
    const name = workers.value.find((w) => w.id === assigneeId.value)?.name ?? '담당자'
    alert.close()
    toast(`${name} 님 앱으로 체크리스트를 보냈습니다.`)
  } catch (error) {
    // 실패하면 창을 닫지 않고 알림 띠로 (화면설계서 C2 '전송 실패')
    toast(error.message || '전송하지 못했습니다. 다시 시도하세요.', { type: 'err' })
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <BaseModal :width="1180" label="주의 상세" @close="alert.close()">
    <template #default="{ close }">
      <div class="m-head">
        <span class="m-chip warn big"><AppIcon name="tri" :size="15" />2단계 주의</span>
        <h2>주의 상세</h2>
        <span class="loc">{{ detail?.location }}</span>
        <button type="button" class="m-close" aria-label="닫기" @click="close"><AppIcon name="x" /></button>
      </div>

      <p v-if="errorMessage" class="state">{{ errorMessage }}</p>
      <p v-else-if="!detail" class="state">불러오는 중</p>

      <div v-else class="cols">
        <!-- 왼쪽: 원인 · 추이 · 예상 원인 -->
        <section class="left">
          <div class="m-sect"><AppIcon name="info" :size="15" />발생 원인</div>
          <WarnCause :detail="detail" class="gap" />
          <MiniTrend :trend="detail.trend" title="전류 추이" :sub="`${detail.rule.sensorTag} · 최근 40분`" class="gap-s" />

          <div class="m-sect top"><AppIcon name="gear" :size="15" />예상 원인</div>
          <div class="causes">
            <span v-for="c in detail.causeCandidates" :key="c" class="m-chip gray cause">{{ c }}</span>
          </div>
          <button type="button" class="btn wide" @click="alert.open('thermal', { alarmId })">
            <AppIcon name="cam" :size="17" />센서 데이터 · 열화상 확인
          </button>
        </section>

        <!-- 오른쪽: 체크리스트 · 받는 사람 · 전송 -->
        <section class="right">
          <div class="m-sect"><AppIcon name="clip" :size="15" />조치 체크리스트 <small>{{ items.length }}개 항목</small></div>
          <ChecklistEditor v-model="items" :readonly="sent()" class="gap" />

          <div class="m-sect top"><AppIcon name="phone" :size="15" />전송 대상</div>
          <WorkerPicker v-model="assigneeId" :workers="workers" class="gap" />

          <p class="note">
            체크리스트와 센서 값, 열화상 이미지가 함께 전송됩니다.<br />
            담당자가 항목을 모두 완료하면 대시보드 상단에서 확인할 수 있습니다.
          </p>
          <div class="m-actions buttons">
            <button type="button" class="btn close" @click="close">닫기</button>
            <button
              type="button"
              class="btn btn-primary send"
              :disabled="sent() || sending || !assigneeId || items.length === 0"
              @click="send"
            >
              <template v-if="sent()"><AppIcon name="check" :size="17" />전송 완료</template>
              <template v-else-if="sending"><span class="m-spin" />보내는 중</template>
              <template v-else><AppIcon name="send" :size="17" />공정 담당자 앱으로 전송</template>
            </button>
          </div>
        </section>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.state {
  padding: 60px 28px;
  text-align: center;
  color: var(--color-text-sub);
}

/* 설계안: 왼쪽 540 · 오른쪽 552, 위 20px */
.cols {
  display: grid;
  grid-template-columns: 540px 1fr;
  gap: 32px;
  padding: 20px 28px 28px;
}

.gap {
  margin-top: 10px;
}

.gap-s {
  margin-top: 12px;
}

.m-sect.top {
  margin-top: 18px;
}

.causes {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.cause {
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 600;
}

.btn.wide {
  width: 100%;
  height: 44px;
  margin-top: 18px;
}

.note {
  margin-top: 12px;
  font-size: 12.5px;
  line-height: 19px;
  color: #64748b;
}

.buttons {
  margin-top: 16px;
}

.close {
  width: 120px;
  height: 48px;
}

.send {
  flex: 1;
  height: 48px;
  font-size: 15px;
}
</style>
