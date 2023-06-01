/*
 * Copyright Truesense AI Solutions Pvt Ltd, All Rights Reserved.
 */
import { Group, LineSegments, Vector3 } from 'three';
import { Maths } from '../../../utils/maths';
import { TvRoadLaneOffset } from '../../tv-map/models/tv-road-lane-offset';
import { TvRoad } from '../../tv-map/models/tv-road.model';
import { AnyControlPoint } from './control-point';

export class LaneOffsetNode extends Group {

	public static readonly tag = 'offset-node';
	public static readonly pointTag = 'offset-point';
	public static readonly lineTag = 'offset-line';

	public line: LineSegments;
	public point: AnyControlPoint;

	constructor ( public road: TvRoad, public laneOffset: TvRoadLaneOffset ) {

		super();

		if ( !road ) return;

		let position: Vector3;

		if ( Maths.approxEquals( laneOffset.s, 0 ) || Maths.approxEquals( laneOffset.road.length, 0 ) ) {

			this.point = AnyControlPoint.create( 'point', new Vector3( 0, 0, 0 ) );

			this.point.tag = LaneOffsetNode.pointTag;

			this.add( this.point );

		} else {

			position = laneOffset.road.getPositionAt( laneOffset.s, 0 ).toVector3();

			this.point = AnyControlPoint.create( 'point', position );

			this.point.tag = LaneOffsetNode.pointTag;

			this.add( this.point );

		}


	}

	get roadId () {
		return this.road.id;
	}

	select () {

		this.point?.select();

	}

	unselect () {

		this.point?.unselect();

	}

	updateScoordinate ( sCoord: number ) {

		const laneOffsets = this.road.getLaneOffsets();

		// this also works
		const index = laneOffsets.findIndex( i => i.uuid === this.laneOffset.uuid );

		// this also works
		// const index = laneOffsets.findIndex( i => i.s >= this.laneOffset.s );

		if ( index < 1 ) return;

		const min = laneOffsets[ index - 1 ].s + 0.1;

		let max = this.road.length;

		if ( index + 1 < laneOffsets.length ) {

			max = laneOffsets[ index + 1 ].s - 0.1;

		}

		this.laneOffset.s = Maths.clamp( sCoord, min, max );

		this.updatePosition();

		this.road.updateLaneOffsetValues();
	}

	updateOffset ( value: number ) {

		this.laneOffset.a = value;

		this.updatePosition();

		this.road.updateLaneOffsetValues();
	}

	updatePosition () {

		if ( !this.road ) return;

		const position = this.road.getPositionAt( this.laneOffset.s, 0 );

		this.point.copyPosition( position.toVector3() );
	}


}
