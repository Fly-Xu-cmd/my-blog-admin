import { DatePicker, Segmented, Typography } from 'antd';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { useState } from 'react';
import styles from './ReportDateRange.module.css';
dayjs.extend(utc);
dayjs.extend(timezone);
export type ReportDates = { start: string; end: string };
const today = () => dayjs().tz('Asia/Shanghai').startOf('day');
export function recentDates(days: number): ReportDates {
  const end = today();
  return {
    start: end.subtract(days - 1, 'day').format('YYYY-MM-DD'),
    end: end.format('YYYY-MM-DD'),
  };
}
export default function ReportDateRange({
  value,
  onChange,
}: {
  value: ReportDates;
  onChange: (value: ReportDates) => void;
}) {
  const presets = [
    { label: '近 7 天', getDates: () => recentDates(7) },
    { label: '本周', getDates: () => recentDates((today().day() + 6) % 7 + 1) },
    { label: '近 30 天', getDates: () => recentDates(30) },
    { label: '本月', getDates: () => recentDates(today().date()) },
  ];
  const [selected, setSelected] = useState(() =>
    presets.find(({ getDates }) => {
      const dates = getDates();
      return dates.start === value.start && dates.end === value.end;
    })?.label ?? '',
  );
  return (
    <div className={styles.controls}>
      <Segmented
        aria-label="快捷日期范围"
        size="small"
        options={presets.map(({ label }) => label)}
        value={selected}
        onChange={(label) => {
          const preset = presets.find((item) => item.label === label);
          if (preset) {
            setSelected(label);
            onChange(preset.getDates());
          }
        }}
      />
      <div>
        <DatePicker.RangePicker
          aria-label="统计日期范围"
          popupClassName={styles.popup}
          placeholder={['开始日期', '结束日期']}
          value={[dayjs(value.start), dayjs(value.end)]}
          allowClear={false}
          format="YYYY-MM-DD"
          style={{ maxWidth: '100%' }}
          disabledDate={(date, info) =>
            date.format('YYYY-MM-DD') > today().format('YYYY-MM-DD') ||
            date.format('YYYY-MM-DD') < '1970-01-01' ||
            !!(
              info.from &&
              Math.abs(
                date.startOf('day').diff(info.from.startOf('day'), 'day'),
              ) > 365
            )
          }
          onChange={(dates) => {
            if (dates?.[0] && dates[1]) {
              setSelected('');
              onChange({
                start: dates[0].format('YYYY-MM-DD'),
                end: dates[1].format('YYYY-MM-DD'),
              });
            }
          }}
        />
        <Typography.Text
          type="secondary"
          style={{ display: 'block', fontSize: 12, marginTop: 4 }}
        >
          上海时间 · 单次最多 366 天
        </Typography.Text>
      </div>
    </div>
  );
}
