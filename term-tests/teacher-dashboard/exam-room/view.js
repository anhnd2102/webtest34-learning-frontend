// NGUỒN: file .ts này; view.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import { ICONS } from '../ui/icons.js';
import { formatAssignmentWindow } from '../results/presentation.js';
import { formatExamReadyCount, formatExamRoomStatus, formatExamProgress, formatExamConnectionStatus, formatExamDevice } from './presentation.js';
export function createExamRoomView({ root, lifecycle, viewState, actions }) {
    const document = root.ownerDocument || root;
    const window = document.defaultView || globalThis.window;
    const currentLocation = window?.location;
    const { showExamRoomTimeline, openGrantRetakeModal } = actions;
    const examRoomSummary = root.querySelector('#exam-room-summary');
    const examRoomStudents = root.querySelector('#exam-room-students');
    const examRoomStartButton = root.querySelector('#exam-room-start');
    const examRoomExtendButton = root.querySelector('#exam-room-extend');
    function renderExamRoom(room) {
        viewState.currentExamRoom = room;
        const roomStatus = ({ waiting: 'Đang chờ', running: 'Đang thi', ended: 'Đã kết thúc' })[room.status ?? ''] || room.status;
        const deadline = room.deadlineAt ? ` · Hạn ${formatAssignmentWindow(room.deadlineAt, null).split(' → ')[0]}` : '';
        if (examRoomSummary)
            examRoomSummary.textContent = `${roomStatus} · ${formatExamReadyCount(room)}${deadline}`;
        if (examRoomStudents) {
            examRoomStudents.replaceChildren();
            for (const student of room.students || []) {
                const row = document.createElement('tr');
                const name = document.createElement('td');
                const participation = document.createElement('td');
                const progress = document.createElement('td');
                const connection = document.createElement('td');
                const incidents = document.createElement('td');
                const device = document.createElement('td');
                name.textContent = student.name || '—';
                participation.textContent = formatExamRoomStatus(student.status);
                progress.textContent = formatExamProgress(student.progress);
                connection.textContent = formatExamConnectionStatus(student.connectionStatus);
                const incidentCount = Number(student.incidentCount) || 0;
                const openIncident = (student.openIncidents || []).length > 0;
                incidents.textContent = student.status === 'not_entered' ? '—' : `${incidentCount}${openIncident ? ' · đang rời bài' : ''}`;
                device.textContent = formatExamDevice(student);
                // 7. Retake Action column in Exam Room
                const retake = document.createElement('td');
                const hasActiveRetake = Boolean(student.retakeGrant?.status === 'granted' || student.status === 'retake_granted' || student.status === 'retaking');
                if (hasActiveRetake) {
                    const retakeWrap = document.createElement('div');
                    retakeWrap.className = 'retake-action-wrap';
                    const badge = document.createElement('span');
                    badge.className = 'retake-badge active';
                    badge.textContent = 'Đã cấp lại';
                    const renewBtn = document.createElement('button');
                    renewBtn.type = 'button';
                    renewBtn.className = 'btn-secondary btn-sm btn-retake-renew';
                    renewBtn.title = 'Gia hạn hoặc điều chỉnh thời hạn làm lại';
                    renewBtn.innerHTML = `${ICONS.clock} <span>Gia hạn</span>`;
                    lifecycle.listen(renewBtn, 'click', (e) => {
                        e.stopPropagation();
                        openGrantRetakeModal({
                            studentRef: student.studentRef,
                            studentName: student.name,
                            discriminator: student.discriminator
                        });
                    });
                    retakeWrap.append(badge, renewBtn);
                    retake.append(retakeWrap);
                }
                else {
                    const retakeBtn = document.createElement('button');
                    retakeBtn.type = 'button';
                    retakeBtn.className = 'btn-secondary btn-sm btn-retake';
                    retakeBtn.title = 'Cấp quyền làm lại bài thi';
                    retakeBtn.innerHTML = `${ICONS.rotate} <span>Làm lại</span>`;
                    lifecycle.listen(retakeBtn, 'click', (e) => {
                        e.stopPropagation();
                        openGrantRetakeModal({
                            studentRef: student.studentRef,
                            studentName: student.name,
                            discriminator: student.discriminator
                        });
                    });
                    retake.append(retakeBtn);
                }
                // Tô đỏ mọi học viên đã có sự cố (không chỉ lúc đang rời bài) để giáo viên không bỏ sót.
                if (incidentCount > 0 || openIncident) {
                    row.className = 'exam-incident-active';
                    row.setAttribute('aria-label', `${student.name || 'Học viên'} có ${incidentCount} sự cố Exam Guard`);
                }
                row.append(name, participation, progress, connection, incidents, device, retake);
                if (student.attemptId) {
                    row.classList.add('exam-room-clickable');
                    row.tabIndex = 0;
                    row.title = 'Bấm để xem timeline sự cố';
                    lifecycle.listen(row, 'click', () => void showExamRoomTimeline(student));
                    lifecycle.listen(row, 'keydown', event => { if (event.key === 'Enter')
                        void showExamRoomTimeline(student); });
                }
                examRoomStudents.append(row);
            }
        }
        if (examRoomStartButton)
            examRoomStartButton.disabled = room.status !== 'waiting';
        if (examRoomExtendButton)
            examRoomExtendButton.disabled = room.status !== 'running';
    }
    return { renderExamRoom };
}
