import { Component, computed, input } from '@angular/core';
import { ApplicationStatus } from '../core/models';

const LABELS: Record<ApplicationStatus, string> = {
  APPROVED: 'Approved',
  MANUAL_REVIEW: 'Manual review',
  REJECTED: 'Rejected',
};
const TONES: Record<ApplicationStatus, string> = { APPROVED: 'ok', MANUAL_REVIEW: 'warn', REJECTED: 'bad' };

@Component({
  selector: 'app-status-badge',
  template: `<span class="badge" [class]="tone()">{{ label() }}</span>`,
})
export class StatusBadge {
  readonly status = input.required<ApplicationStatus>();
  protected readonly label = computed(() => LABELS[this.status()]);
  protected readonly tone = computed(() => `badge ${TONES[this.status()]}`);
}

export const statusLabel = (s: ApplicationStatus) => LABELS[s];
export const statusTone = (s: ApplicationStatus) => TONES[s];
