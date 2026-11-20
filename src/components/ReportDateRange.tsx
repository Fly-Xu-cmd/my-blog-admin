import { DatePicker, Typography } from 'antd';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
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
  return (
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
        presets={[
          {
            label: '近 7 天',
            value: () => [today().subtract(6, 'day'), today()],
          },
          {
            label: '本周',
            value: () => [
              today().subtract((today().day() + 6) % 7, 'day'),
              today(),
            ],
          },
          {
            label: '近 30 天',
            value: () => [today().subtract(29, 'day'), today()],
          },
          { label: '本月', value: () => [today().startOf('month'), today()] },
        ]}
        onChange={(dates) => {
          if (dates?.[0] && dates[1])
            onChange({
              start: dates[0].format('YYYY-MM-DD'),
              end: dates[1].format('YYYY-MM-DD'),
            });
        }}
      />
      <Typography.Text
        type="secondary"
        style={{ display: 'block', fontSize: 12, marginTop: 4 }}
      >
        上海时间 · 单次最多 366 天
      </Typography.Text>
    </div>
  );
}
