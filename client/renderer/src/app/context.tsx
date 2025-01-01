import { createContext } from "react";
import { RoomSocket } from "../services/room"
import Notifications from 'rc-notification';

export type GlobalContextModel = {
    socket: RoomSocket | null;
    webSocketStatus: 'open' | 'close' | 'connecting';
    notify: Notifications.NotificationAPI | null;
}

export const GlobalContext = createContext<GlobalContextModel>({
    socket: null,
    webSocketStatus: 'close',
    notify: null,
});