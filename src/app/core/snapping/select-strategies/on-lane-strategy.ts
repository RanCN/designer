import { SelectStrategy } from "./select-strategy";
import { TvLane } from "../../../modules/tv-map/models/tv-lane";
import { PointerEventData } from "../../../events/pointer-event-data";
import { TvLaneCoord } from "../../../modules/tv-map/models/tv-lane-coord";

export class OnLaneStrategy extends SelectStrategy<TvLane> {

    private lane: TvLane;
    private selected: TvLane;

    constructor () {
        super();
    }

    onPointerDown ( pointerEventData: PointerEventData ): TvLane {

        // this.selected?.unselect();

        this.selected = this.onLaneGeometry( pointerEventData );

        // this.selected?.select();

        return this.selected;

    }

    onPointerMoved ( pointerEventData: PointerEventData ): TvLane {

        this.lane?.unhighlight();

        this.lane = this.onLaneGeometry( pointerEventData );

        this.lane?.highlight();

        return this.lane;
    }

    onPointerUp ( pointerEventData: PointerEventData ): TvLane {

        return this.onLaneGeometry( pointerEventData );

    }

    dispose (): void {

        this.lane?.unhighlight();
        this.selected?.unselect();

    }

}

export class LaneCoordStrategy extends SelectStrategy<TvLaneCoord> {

    private lane: TvLane;
    private selectedLane: TvLane;

    constructor () {
        super();
    }

    onPointerDown ( pointerEventData: PointerEventData ): TvLaneCoord {

        const laneCoord = this.onLaneCoord( pointerEventData );

        if ( ! laneCoord ) return;

        this.selectedLane = laneCoord.lane;

        return laneCoord;

    }

    onPointerMoved ( pointerEventData: PointerEventData ): TvLaneCoord {

        const laneCoord = this.onLaneCoord( pointerEventData );

        if ( ! laneCoord ) return;

        this.lane?.unhighlight();

        this.lane = laneCoord.lane;

        this.lane?.highlight();

        return laneCoord;
    }

    onPointerUp ( pointerEventData: PointerEventData ): TvLaneCoord {

        return this.onLaneCoord( pointerEventData );

    }

    dispose (): void {

        this.lane?.unhighlight();
        this.selectedLane?.unselect();

    }

}