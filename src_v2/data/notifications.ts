import { notificationRows } from '../../shared/communicationsStore'
import type { NotificationItem } from '../components/NotificationBell'
export function getStudentNotifications(_studentId: string): NotificationItem[] { return [...notificationRows] }
