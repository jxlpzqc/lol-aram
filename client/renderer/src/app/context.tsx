import { createContext } from "react";
import { RoomSocket } from "../services/room"
import Notifications from 'rc-notification';
import { ModalAPI } from "../components/LeagueModal";

export type GlobalContextModel = {
    socket: RoomSocket | null;
    webSocketStatus: 'open' | 'close' | 'connecting';
    notify: Notifications.NotificationAPI | null;
    modals: ModalAPI | null
}

export const GlobalContext = createContext<GlobalContextModel>({
    socket: null,
    webSocketStatus: 'close',
    notify: null,
    modals: null,
});