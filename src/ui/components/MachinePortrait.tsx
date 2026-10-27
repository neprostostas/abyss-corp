import type { UpgradeId } from '../../domain/game';
import {
  MiningRig,
  SubmarineModel,
  RefineryModel,
  WarehouseModel,
} from '../world/WorldModels';

export function MachinePortrait({
  id,
  level,
  color,
}: {
  id: UpgradeId;
  level: number;
  color: string;
}) {
  const viewBox = {
    mining: '-100 -170 200 210',
    transport: '-100 -65 215 125',
    processing: '-150 -245 300 315',
    storage: '-100 -215 200 280',
  }[id];
  return (
    <svg className="machine-portrait" viewBox={viewBox} aria-hidden="true">
      {id === 'mining' && <MiningRig level={level} active={false} />}
      {id === 'transport' && (
        <SubmarineModel
          level={level}
          color={color}
          loaded={false}
          facingLeft={false}
        />
      )}
      {id === 'processing' && (
        <RefineryModel level={level} active={false} blocked={false} />
      )}
      {id === 'storage' && (
        <WarehouseModel level={level} color={color} fraction={0.5} />
      )}
    </svg>
  );
}
