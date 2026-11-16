/**
 * 사업장 펼치기용 공장 목록 불러오기 (GET /sites/{siteId}/tree)
 * - 사업장마다 처음 펼칠 때 한 번만 불러오고, 다음부터는 저장된 값을 씀
 * - trees[siteId] = { loading, error, factories }
 */
import { ref } from 'vue'
import { getSiteTree } from '@/api/sites'
import { factoryLevels } from './siteStats'

export function useSiteTrees() {
  const trees = ref({})

  async function loadTree(siteId) {
    if (trees.value[siteId]?.factories || trees.value[siteId]?.loading) return
    trees.value[siteId] = { loading: true, error: '', factories: null }
    try {
      const tree = await getSiteTree(siteId)
      trees.value[siteId] = {
        loading: false,
        error: '',
        // 공장 줄의 센서 개수 = 전류·온도·CO 개수 합
        factories: tree.factories.map((f) => ({ ...f, counts: factoryLevels(f) })),
      }
    } catch (error) {
      trees.value[siteId] = { loading: false, error: error.message, factories: null }
    }
  }

  return { trees, loadTree }
}
