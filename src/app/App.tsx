import { GameScreen } from '../ui/screens/GameScreen';
import type { GameSession } from '../application/GameSession';

export function App({ session }: { session: GameSession }) {
  return <GameScreen session={session} />;
}
