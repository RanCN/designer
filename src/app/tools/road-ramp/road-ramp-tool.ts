/*
 * Copyright Truesense AI Solutions Pvt Ltd, All Rights Reserved.
 */

import { PointerEventData } from 'app/events/pointer-event-data';
import { Vector3 } from 'three';
import { ToolType } from '../tool-types.enum';
import { BaseTool } from '../base-tool';
import { SelectStrategy } from 'app/core/snapping/select-strategies/select-strategy';
import { LaneCoordStrategy } from "../../core/snapping/select-strategies/on-lane-strategy";
import { TvLaneCoord } from 'app/modules/tv-map/models/tv-lane-coord';
import { CommandHistory } from 'app/services/command-history';
import { AddRoadCommand } from '../road/add-road-command';
import { TvOrientation } from "../../modules/tv-map/models/tv-common";
import { JunctionFactory } from 'app/factories/junction.factory';
import { AddJunctionCommand } from 'app/commands/add-junction-command';
import { AutoSpline } from 'app/core/shapes/auto-spline';

export class RoadRampTool extends BaseTool {

	name: string = 'RoadRampTool';
	toolType: ToolType = ToolType.RoadRampTool;

	// lane: TvLane;
	// start = new Vector3;
	// end = new Vector3();
	// posTheta: TvPosTheta;

	private laneStrategy: SelectStrategy<TvLaneCoord>;

	private startCoord: TvLaneCoord;
	private endCoord: TvLaneCoord | Vector3;

	private rampRoadSpline: AutoSpline;

	init (): void {

		this.laneStrategy = new LaneCoordStrategy();

	}

	enable (): void {

		super.enable();

	}

	disable (): void {

		super.disable();

		this.laneStrategy?.dispose();

	}

	onPointerDownSelect ( e: PointerEventData ): void {

		const laneCoord = this.laneStrategy?.onPointerDown( e );

		console.log( 'select', laneCoord );

		if ( !laneCoord ) return;

		if ( this.startCoord ) {

			this.endCoord = laneCoord;

			const virtualJunction = JunctionFactory.createVirtualJunction( this.startCoord.road, this.startCoord.s, this.startCoord.s + 20, TvOrientation.PLUS );

			const rampRoad = JunctionFactory.createRampRoad( virtualJunction, this.startCoord, this.endCoord );

			CommandHistory.executeMany( new AddRoadCommand( [ rampRoad ], true ), new AddJunctionCommand( virtualJunction ) );

			this.startCoord = this.endCoord = this.rampRoadSpline = null;

		} else {

			this.startCoord = laneCoord;

			this.endCoord = e.point;

			this.rampRoadSpline = JunctionFactory.makeRampSpline( this.startCoord.position, this.endCoord, this.startCoord.posTheta.toDirectionVector() );

			this.rampRoadSpline.show();

		}

	}

	onPointerMoved ( e: PointerEventData ) {

		const laneCoord = this.laneStrategy?.onPointerMoved( e );

		if ( !this.startCoord ) return;

		this.endCoord = e.point;

		if ( this.rampRoadSpline ) {
			JunctionFactory.updateRampSpline( this.rampRoadSpline, this.startCoord.position, this.endCoord, this.startCoord.posTheta.toDirectionVector() );
		}

		console.log( 'moved', this.startCoord.position.distanceTo( e.point ), this.startCoord, this.endCoord );

	}

	// onPointerUp ( e: PointerEventData ) {

	// 	// const laneCoord = this.laneStrategy?.onPointerUp( e );

	// 	// if ( this.startCoord && this.endCoord ) {

	// 	// 	this.endCoord = laneCoord || e.point;

	// 	// 	console.log( 'create ramp', this.startCoord, this.endCoord );

	// 	// 	const virtualJunction = JunctionFactory.createVirtualJunction( this.startCoord.road, this.startCoord.s, this.startCoord.s + 20, TvOrientation.PLUS );

	// 	// 	const rampRoad = JunctionFactory.createRampRoad( virtualJunction, this.startCoord, this.endCoord );

	// 	// 	CommandHistory.executeMany( new AddRoadCommand( [ rampRoad ], false ), new AddJunctionCommand( virtualJunction ) );

	// 	// 	this.startCoord = null;
	// 	// 	this.endCoord = null;

	// 	// }

	// 	// if ( e.button != MouseButton.LEFT ) return;

	// 	// // console.log( 'is down', this.isPointerDown, this.pointerDownAt, 'up at', e.point );

	// 	// if ( this.lane && this.start ) {

	// 	// 	// console.log( 'create ramp', this.lane, this.start, this.end );

	// 	// 	// SceneService.add( AnyControlPoint.create( '', this.start ) );
	// 	// 	// SceneService.add( AnyControlPoint.create( '', this.end ) );

	// 	// 	const start = TvMapQueries.getLaneStartPosition( this.lane.roadId, this.lane.id, this.posTheta.s, 0 );

	// 	// 	this.makeRampRoad( start, this.end, this.posTheta );

	// 	// 	this.start = null;
	// 	// 	this.lane = null;
	// 	// 	this.end = null;

	// 	// }

	// }

	// isLaneSelected ( e: PointerEventData ): boolean {

	// 	const interactedLane = PickingHelper.checkLaneObjectInteraction( e );

	// 	if ( !interactedLane ) return false;

	// 	const posTheta = new TvPosTheta();

	// 	// getting position on track in s/t coordinates
	// 	const result = TvMapQueries.getRoadByCoords( e.point.x, e.point.y, posTheta );

	// 	// TvMapQueries.getRoadPosition( result.road.id, posTheta.s, posTheta.t );

	// 	this.start = e.point.clone();
	// 	this.posTheta = posTheta;
	// 	this.lane = interactedLane;

	// 	// this.makeSpline( this.start, this.lane, posTheta );

	// 	// get the exisiting lane road mark at s and clone it
	// 	// const roadMark = interactedLane.getRoadMarkAt( posTheta.s ).clone( posTheta.s );
	// }

	// makeRampRoad(A: Vector3, B: Vector3, posTheta: TvPosTheta) {
	//     const direction = posTheta.toDirectionVector();
	//     const normalizedDirection = direction.clone().normalize();

	//     const upVector = new Vector3(0, 0, 1);
	//     const perpendicular = normalizedDirection.clone().cross(upVector);

	//     const midPoint = A.clone().add(B).multiplyScalar(0.5);

	//     const distanceAB = A.distanceTo(B);
	//     const offsetFactor = 0.25 * distanceAB;

	//     const v2 = A.clone().add(normalizedDirection.clone().multiplyScalar(offsetFactor));
	//     const v3 = midPoint.clone().add(perpendicular.clone().multiplyScalar(offsetFactor));

	//     const road = this.map.addDefaultRoad();

	//     road.addControlPointAt(A);
	//     road.addControlPointAt(v2);
	//     road.addControlPointAt(v3);
	//     road.addControlPointAt(B);

	//     console.log("road", [A, v2, v3, B]);

	//     road.updateGeometryFromSpline();
	// }

	// makeRampRoad ( A: Vector3, B: Vector3, posTheta: TvPosTheta ) {

	// 	let v2, v3;

	// 	[ A, v2, v3, B ] = this.makeRampRoadPoints( A, B, posTheta.toDirectionVector() );

	// 	const newLane = this.lane.cloneAtS( -1, posTheta.s );

	// 	const road = this.map.addRampRoad( newLane );

	// 	road.addControlPointAt( A );
	// 	road.addControlPointAt( v2 );
	// 	road.addControlPointAt( v3 );
	// 	road.addControlPointAt( B );

	// 	road.updateGeometryFromSpline();

	// 	TvMapBuilder.rebuildRoad( road );
	// }

	// makeRampRoad ( A: Vector3, B: Vector3, posTheta: TvPosTheta ) {

	// 	const direction = posTheta.toDirectionVector();
	// 	const normalizedDirection = direction.clone().normalize();

	// 	const upVector = new Vector3( 0, 0, 1 );
	// 	const perpendicular = normalizedDirection.clone().cross( upVector );

	// 	const distanceAB = A.distanceTo( B );

	// 	function calculateBezier ( t, p0, p1, p2, p3 ) {
	// 		const oneMinusT = 1 - t;
	// 		return p0.clone().multiplyScalar( Math.pow( oneMinusT, 3 ) )
	// 			.add( p1.clone().multiplyScalar( 3 * t * Math.pow( oneMinusT, 2 ) ) )
	// 			.add( p2.clone().multiplyScalar( 3 * Math.pow( t, 2 ) * oneMinusT ) )
	// 			.add( p3.clone().multiplyScalar( Math.pow( t, 3 ) ) );
	// 	}

	// 	const road = this.map.addDefaultRoad();

	// 	const controlPoint1 = A.clone().add( normalizedDirection.clone().multiplyScalar( distanceAB / 3 ) );
	// 	const controlPoint2 = B.clone().add( perpendicular.clone().multiplyScalar( -distanceAB / 3 ) );

	// 	const v2 = calculateBezier( 1 / 3, A, controlPoint1, controlPoint2, B );
	// 	const v3 = calculateBezier( 2 / 3, A, controlPoint1, controlPoint2, B );

	// 	road.addControlPointAt( A );
	// 	road.addControlPointAt( v2 );
	// 	road.addControlPointAt( v3 );
	// 	road.addControlPointAt( B );

	// 	console.log( "road", [ A, v2, v3, B ] );

	// 	road.updateGeometryFromSpline();
	// }

}
