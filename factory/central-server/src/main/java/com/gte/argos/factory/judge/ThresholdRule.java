package com.gte.argos.factory.judge;

/**
 * 센서 하나에 지금 적용 중인 기준값 (sensor_threshold 한 줄).
 * 상한(warn/alarm)과 하한(lowWarn/lowAlarm)은 비어 있을 수 있다.
 * 비교는 "이상/이하"(경계값 포함)로 한다.
 *
 * @param thresholdId  sensor_threshold.threshold_id (이벤트에 판정 근거로 남김)
 * @param warn         주의 상한
 * @param alarm        경보 상한
 * @param lowWarn      주의 하한
 * @param lowAlarm     경보 하한
 * @param warnSamples  주의로 판정하려면 연속으로 넘어야 하는 샘플 수
 * @param alarmSamples 경보로 판정하려면 연속으로 넘어야 하는 샘플 수
 */
public record ThresholdRule(
        long thresholdId,
        Double warn,
        Double alarm,
        Double lowWarn,
        Double lowAlarm,
        int warnSamples,
        int alarmSamples) {

    public ThresholdRule {
        if (warnSamples < 1 || alarmSamples < 1) {
            throw new IllegalArgumentException("지속 샘플 수는 1 이상이어야 합니다");
        }
    }

    /** 값 하나가 어느 단계 범위에 있는지 (지속 조건은 보지 않음) */
    public Stage classify(double v) {
        if ((alarm != null && v >= alarm) || (lowAlarm != null && v <= lowAlarm)) {
            return Stage.ALARM;
        }
        if ((warn != null && v >= warn) || (lowWarn != null && v <= lowWarn)) {
            return Stage.WARN;
        }
        return Stage.NORMAL;
    }

    /** 하한 쪽으로 벗어난 값인지 (전류 저하 등). 최고값 대신 최저값을 기록할 때 쓴다 */
    public boolean isLowSide(double v) {
        boolean low = (lowWarn != null && v <= lowWarn) || (lowAlarm != null && v <= lowAlarm);
        boolean high = (warn != null && v >= warn) || (alarm != null && v >= alarm);
        return low && !high;
    }
}
