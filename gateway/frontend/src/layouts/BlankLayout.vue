<!--
  빈 레이아웃 (상단 바 없음)
  - 로그인, 사업장 선택 화면에서 사용
  - 내용은 화면 가운데에 배치
-->
<template>
  <div class="blank-layout">
    <RouterView />
  </div>
</template>

<style scoped>
.blank-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
</style>
