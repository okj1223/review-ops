export const STICKY_COL_WIDTH = 'w-8'
export const EPISODE_COL_WIDTH = 'w-20'
export const ACTION_COL_WIDTH = 'w-[10rem]'
export const TASK_COL_WIDTH = 'w-[11rem]'
export const RESULT_COL_WIDTH = 'w-24'
export const FRAME_COL_WIDTH = 'w-16'
export const CONFLICT_COL_WIDTH = 'w-[10rem]'
export const REASON_CODE_COL_WIDTH = 'w-[12rem]'
export const DETAIL_COL_WIDTH = 'w-[18rem]'
export const ROUTE_COL_WIDTH = 'w-[12rem]'
export const LAST_UPDATED_COL_WIDTH = 'w-[8rem]'

export const STICKY_CONTROL_LEFT = 'left-0'
export const STICKY_EPISODE_LEFT = 'left-8'
export const STICKY_ACTION_LEFT = 'left-28'

export function getWorkDayColumnWidths(frameCount: number) {
  return [
    '2rem',
    '5rem',
    '10rem',
    '11rem',
    '6rem',
    ...Array.from({ length: frameCount }, () => '4rem'),
    '6rem',
    ...Array.from({ length: frameCount }, () => '4rem'),
    '10rem',
    '6rem',
    ...Array.from({ length: frameCount }, () => '4rem'),
    '12rem',
    '18rem',
    '18rem',
    '12rem',
    '8rem',
  ]
}
