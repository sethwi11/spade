import { Notification } from 'electron';
import log from 'electron-log/main';
import { popupButtons, type Popup } from '@todo/shared';

export interface PopupActions {
  open: (url: string) => void;
  done: (taskId: string) => void;
  snooze: (popup: Popup) => void;
}

const showing = new Set<Notification>();

/** One system notification. Clicking it opens the window on its page; a button acts without opening the window. */
export function showPopup(popup: Popup, actions: PopupActions): void {
  const buttons = popupButtons(popup);
  const notification = new Notification({ title: popup.title, body: popup.body, actions: buttons.map((b) => ({ type: 'button', text: b.text })) });
  showing.add(notification); // or it can be collected before it's clicked
  const open = () => actions.open(popup.url.startsWith('/') ? popup.url : '/');
  notification.on('click', open);
  notification.on('action', (_event, index) => {
    const id = buttons[index]?.id;
    if (id === 'done' && popup.ref) actions.done(popup.ref);
    else if (id === 'snooze') actions.snooze(popup);
    else open();
  });
  notification.on('close', () => showing.delete(notification));
  // macOS refused it (notifications not allowed for Spade, or the app isn't signed).
  notification.on('failed', (_event, error) => log.error(`Pop-up not shown: ${error}`));
  notification.show();
}
