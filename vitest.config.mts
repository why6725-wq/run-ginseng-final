import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // lib/ 의 순수 계산 로직만 검사한다. 화면은 브라우저로 따로 확인한다.
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
