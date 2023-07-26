/*
 * Copyright Truesense AI Solutions Pvt Ltd, All Rights Reserved.
 */

import { JunctionEntryObject } from 'app/modules/three-js/objects/junction-entry.object';
import { TvContactPoint, TvLaneSide, TvLaneType } from 'app/modules/tv-map/models/tv-common';
import { TvLane } from 'app/modules/tv-map/models/tv-lane';
import { TvRoad } from 'app/modules/tv-map/models/tv-road.model';
import { TvMapQueries } from 'app/modules/tv-map/queries/tv-map-queries';
import { TvMapInstance } from 'app/modules/tv-map/services/tv-map-source-file';
import { CommandHistory } from 'app/services/command-history';
import { SnackBar } from 'app/services/snack-bar.service';
import { SceneService } from '../services/scene.service';
import { CreateSingleManeuver } from '../tools/maneuver/create-single-maneuver';
import { TvConsole } from '../utils/console';
import { TvJunction } from 'app/modules/tv-map/models/tv-junction';
import { TvJunctionConnection } from 'app/modules/tv-map/models/tv-junction-connection';

export class JunctionFactory {

	static connectTwo ( entry: JunctionEntryObject, exit: JunctionEntryObject ) {

		throw new Error( 'Method not implemented.' );

	}

	static createJunctions () {

		const roads = TvMapInstance.map.getRoads();

		const entries = this.createEntries( roads );

		this.mergeEntries( entries );
	}

	static showJunctionEntries () {

		const roads = TvMapInstance.map.getRoads();

		const entries = this.createEntries( roads );

		entries.forEach( entry => {

			SceneService.add( entry );

		} );
	}

	static createJunctionEntries ( allRoads: TvRoad[] ): JunctionEntryObject[] {

		const roads = allRoads.filter( road => !road.isJunction );

		return this.createEntries( roads );

	}

	static createEntries ( roads: TvRoad[] ) {

		const entries: JunctionEntryObject[] = [];

		for ( let i = 0; i < roads.length; i++ ) {

			entries.push( ...this.createJunctionEntriesForRoad( roads[ i ], TvContactPoint.START ) );

			entries.push( ...this.createJunctionEntriesForRoad( roads[ i ], TvContactPoint.END ) );

		}

		return entries;
	}


	static createJunctionEntriesForRoad ( road: TvRoad, contact: TvContactPoint ): JunctionEntryObject[] {

		// we dont want create junction points if predecessor or successor is road
		// junction points are created with when road is not connected or connected to junction

		if ( contact == TvContactPoint.START && road.predecessor?.elementType == 'road' ) {
			return [];
		}

		if ( contact == TvContactPoint.END && road.successor?.elementType == 'road' ) {
			return [];
		}

		const laneSection = contact == TvContactPoint.START ?
			road.getFirstLaneSection() :
			road.getLastLaneSection();

		if ( !laneSection ) TvConsole.error( 'No lane section found for Road: ' + road.id );
		if ( !laneSection ) return [];

		const lanes = laneSection.getLaneArray().filter( lane => lane.id !== 0 && lane.type === TvLaneType.driving );

		return lanes.map( lane => this.createJunctionEntry( road, lane, contact ) );
	}

	static createJunctionEntry ( road: TvRoad, lane: TvLane, contact: TvContactPoint ): JunctionEntryObject {

		const s = contact == TvContactPoint.START ? 0 : road.length;

		const position = TvMapQueries.getLanePosition( road.id, lane.id, s );

		const name = `road-${ road.id }-lane-${ lane.id }-${ contact }`;

		return new JunctionEntryObject( name, position, contact, road, lane );
	}

	static mergeEntries ( objects: JunctionEntryObject[] ) {

		const roads = this.groupEntriesByRoad( objects );

		const junctions = new Map<number, TvJunction>();

		objects.filter( i => i.junction != null ).forEach( e => junctions.set( e.junction.id, e.junction ) );

		if ( junctions.size == 0 ) {

			const junction = TvMapInstance.map.addNewJunction();

			this.mergeEntriesV3( junction, objects );

		} else if ( junctions.size == 1 ) {

			const junction = junctions.values().next().value;

			this.mergeEntriesV3( junction, objects );

		} else {

			TvConsole.warn( 'Multiple junctions entries cannot be auto-merged' );

		}

	}

	// // merging entries based on angle
	// static mergeComplexEntries ( objects: JunctionEntryObject[] ) {

	// 	const results = [];

	// 	for ( let i = 0; i < objects.length; i++ ) {

	// 		const A = objects[ i ];

	// 		const mergeOptions = objects
	// 			.filter( B => B.road.id !== A.road.id )
	// 			.filter( B => B.junctionType != A.junctionType )
	// 			.filter( B => !A.canConnect( B ) )
	// 			.forEach( B => {

	// 				const aPos = A.getJunctionPosTheta();
	// 				const bPos = B.getJunctionPosTheta();

	// 				const sideAngle = aPos.computeSideAngle( bPos );

	// 				if ( sideAngle.angleDiff <= 20 ) {

	// 					// for straight connections we only merge same lane-id
	// 					if ( Math.abs( A.lane.id ) != Math.abs( B.lane.id ) ) return;

	// 					console.log( 'straight' );

	// 					const entry = A.isEntry ? A : B;

	// 					const exit = A.isExit ? A : B;

	// 					this.connect( entry, exit );

	// 				} else if ( sideAngle.side == TvLaneSide.LEFT ) {

	// 					if ( B.isLastDrivingLane() ) return;

	// 					console.log( 'left' );

	// 					const entry = A.isEntry ? A : B;

	// 					const exit = A.isExit ? A : B;

	// 					this.connect( entry, exit );

	// 				} else if ( sideAngle.side == TvLaneSide.RIGHT ) {

	// 					if ( B.isLastDrivingLane() ) return;

	// 					console.log( 'right' );

	// 					const entry = A.isEntry ? A : B;

	// 					const exit = A.isExit ? A : B;

	// 					this.connect( entry, exit );

	// 				}

	// 			} );


	// 		console.log( A, mergeOptions );

	// 	}
	// }

	// static straightConnection ( entry: JunctionEntryObject, exit: JunctionEntryObject ) {

	// 	const aPos = entry.getJunctionPosTheta();
	// 	const bPos = exit.getJunctionPosTheta();

	// 	const sideAngle = aPos.computeSideAngle( bPos );

	// 	if ( sideAngle.angleDiff <= 20 ) {

	// 		// for straight connections we only merge same lane-id
	// 		if ( Math.abs( entry.lane.id ) != Math.abs( exit.lane.id ) ) return;

	// 		console.log( 'straight' );

	// 		this.connect( entry, exit );

	// 	}

	// 	// else if ( sideAngle.side == TvLaneSide.LEFT ) {

	// 	// 	if ( exit.isLastDrivingLane() ) return;

	// 	// 	console.log( 'left' );

	// 	// 	this.connect( entry, exit );

	// 	// } else if ( sideAngle.side == TvLaneSide.RIGHT ) {

	// 	// 	if ( exit.isLastDrivingLane() ) return;

	// 	// 	console.log( 'right' );

	// 	// 	this.connect( entry, exit );

	// 	// }

	// }

	static mergeEntriesV3 ( junction: TvJunction, objects: JunctionEntryObject[] ) {

		const roads = this.groupEntriesByRoad( objects );
		const keys = Array.from( roads.keys() );

		// straight connections
		for ( let i = 0; i < objects.length; i++ ) {

			const left = objects[ i ];

			for ( let j = i + 1; j < objects.length; j++ ) {

				const right = objects[ j ];

				if ( left.canConnect( right ) && left.isStraightConnection( right ) ) {

					const entry = left.isEntry ? left : right;
					const exit = left.isExit ? left : right;

					this.connect( junction, entry, exit );
				}
			}
		}

		for ( let i = 0; i < keys.length; i++ ) {

			const road1 = roads.get( keys[ i ] );

			for ( let j = i + 1; j < keys.length; j++ ) {

				const road2 = roads.get( keys[ j ] );

				this.makeRightManeuvers( junction, road1, road2 );
				this.makeRightManeuvers( junction, road2, road1 );

				this.makeLeftManeuvers( junction, road1, road2 );
				this.makeLeftManeuvers( junction, road2, road1 );

			}
		}

	}

	static groupEntriesByRoad ( objects: JunctionEntryObject[] ): Map<number, JunctionEntryObject[]> {

		const roads = new Map<number, JunctionEntryObject[]>();

		objects.forEach( entry => {

			if ( !roads.has( entry.road.id ) ) {
				roads.set( entry.road.id, [] );
			}

			roads.get( entry.road.id ).push( entry );

		} );

		return roads;
	}

	static connect ( junction: TvJunction, entry: JunctionEntryObject, exit: JunctionEntryObject ) {

		if ( !junction ) {

			( new CreateSingleManeuver( null, entry, exit, junction, null, null ) ).execute();

		} else {

			const connection = junction.findRoadConnection( entry.road, exit.road );

			const laneLink = connection?.laneLink.find( i => i.from === entry.lane.id );

			if ( connection && laneLink ) {

				TvConsole.warn( 'Connection already exists' );

			} else {

				( new CreateSingleManeuver( null, entry, exit, junction, connection, laneLink ) ).execute();

			}

		}

	}

	static makeRightManeuvers ( junction: TvJunction, listA: JunctionEntryObject[], listB: JunctionEntryObject[] ) {

		const inDescOrder = ( a, b ) => a.id > b.id ? -1 : 1;
		const inAscOrder = ( a, b ) => a.id > b.id ? 1 : -1;

		const contactA = listA[ 0 ].contact;
		const finalA = listA
			.filter( e => contactA == TvContactPoint.END ? e.lane.isRight : e.lane.isLeft )
			.sort( contactA == TvContactPoint.START ? inAscOrder : inDescOrder );

		const contactB = listB[ 0 ].contact;
		const finalB = listB
			.filter( e => contactB == TvContactPoint.END ? e.lane.isLeft : e.lane.isRight )
			.sort( contactB == TvContactPoint.START ? inDescOrder : inAscOrder );

		for ( let i = 0; i < finalA.length; i++ ) {

			const element = finalA[ i ];

			if ( i < finalB.length ) {

				const otherElement = finalB[ i ];

				if ( !element.isRightConnection( otherElement ) ) continue;

				const entry = element.isEntry ? element : otherElement;

				const exit = element.isExit ? element : otherElement;

				if ( !entry.isRightMost() ) continue

				this.connect( junction, entry, exit );

			}
		}

	}

	static makeLeftManeuvers ( junction: TvJunction, listA: JunctionEntryObject[], listB: JunctionEntryObject[] ) {

		const inDescOrder = ( a, b ) => a.id > b.id ? -1 : 1;
		const inAscOrder = ( a, b ) => a.id > b.id ? 1 : -1;

		const contactA = listA[ 0 ].contact;
		const finalA = listA
			.filter( e => contactA == TvContactPoint.END ? e.lane.isRight : e.lane.isLeft )
			.sort( contactA == TvContactPoint.END ? inDescOrder : inAscOrder );

		const contactB = listB[ 0 ].contact;
		const finalB = listB
			.filter( e => contactB == TvContactPoint.START ? e.lane.isRight : e.lane.isLeft )
			.sort( contactB == TvContactPoint.START ? inAscOrder : inDescOrder );

		for ( let i = 0; i < finalA.length; i++ ) {

			const element = finalA[ i ];

			if ( i < finalB.length ) {

				const otherElement = finalB[ i ];

				if ( !element.isLeftConnection( otherElement ) ) continue;

				const entry = element.isEntry ? element : otherElement;

				const exit = element.isExit ? element : otherElement;

				if ( !entry.isLeftMost() ) continue

				this.connect( junction, entry, exit );

			}
		}

	}

}
