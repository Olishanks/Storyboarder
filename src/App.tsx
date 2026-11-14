import { SketchEditor } from './draw/SketchEditor';
import { useRoute, type Route } from './router';
import { BoardScreen } from './screens/BoardScreen';
import { Filming } from './screens/Filming';
import { Home } from './screens/Home';
import { Playthrough } from './screens/Playthrough';
import { PrintView } from './screens/PrintView';
import { useBoard } from './store/useBoard';

type BoardRoute = Exclude<Route, { name: 'home' }>;

/** One board store for every screen of a board, so edits and undo carry across them. */
function BoardRoutes({ route }: { route: BoardRoute }) {
  const store = useBoard(route.id);

  if (store.loading) {
    return (
      <main className="board" aria-busy="true">
        <div className="board-bar board-bar-skeleton" />
      </main>
    );
  }
  if (store.loadError) {
    return (
      <main className="home">
        <div className="empty">
          <h1>Storage on this device couldn’t be opened</h1>
          <p>
            Your boards have not been deleted. Private browsing can block storage; otherwise closing the app fully and
            opening it again usually fixes this.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </main>
    );
  }
  if (!store.board) {
    return (
      <main className="home">
        <div className="empty">
          <h1>This board can’t be found</h1>
          <p>It may have been deleted, or it was made on another device. Boards are stored on the device that made them.</p>
          <a className="btn btn-primary" href="#/">
            All boards
          </a>
        </div>
      </main>
    );
  }
  switch (route.name) {
    case 'sketch':
      return <SketchEditor key={route.panelId} store={store} panelId={route.panelId} />;
    case 'play':
      return <Playthrough store={store} />;
    case 'film':
      return <Filming store={store} />;
    case 'print':
      return <PrintView store={store} />;
    default:
      return <BoardScreen store={store} />;
  }
}

export function App() {
  const route = useRoute();
  if (route.name === 'home') return <Home />;
  return <BoardRoutes key={route.id} route={route} />;
}
