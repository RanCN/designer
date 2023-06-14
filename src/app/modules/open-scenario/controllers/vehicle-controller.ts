/*
 * Copyright Truesense AI Solutions Pvt Ltd, All Rights Reserved.
 */

import { Time } from '../../../core/time';
import { Maths } from '../../../utils/maths';
import { TvContactPoint } from '../../tv-map/models/tv-common';
import { TvLane } from '../../tv-map/models/tv-lane';
import { TvMap } from '../../tv-map/models/tv-map.model';
import { TvPosTheta } from '../../tv-map/models/tv-pos-theta';
import { TvRoad } from '../../tv-map/models/tv-road.model';
import { TvMapQueries } from '../../tv-map/queries/tv-map-queries';
import { EntityObject } from '../models/tv-entities';
import { AbstractController } from '../models/tv-interfaces';
import { ScenarioDirectorService } from '../services/scenario-director.service';
import { TvScenarioInstance } from '../services/tv-scenario-instance';

export class DefaultVehicleController extends AbstractController {

	constructor ( private openDrive: TvMap, private entity: EntityObject ) {
		super();
	}

	private get actor () {

		return this.entity;

	}

	static getSuccessorRoad ( currentRoad: TvRoad, openDrive: TvMap ) {

		let nextRoad: TvRoad;

		const successor = currentRoad.successor;

		if ( successor.elementType == 'road' ) {

			nextRoad = openDrive.getRoadById( successor.elementId );

		} else if ( successor.elementType == 'junction' ) {

			const junction = openDrive.getJunctionById( successor.elementId );
			const connection = junction.getRandomConnectionFor( currentRoad.id );

			nextRoad = openDrive.getRoadById( connection.connectingRoad );
		}

		return nextRoad;
	}

	public update () {

		const actor = this.actor;
		const roads = this.openDrive.roads;

		const currentRoad = roads.get( actor.roadId );
		const currentLaneSection = currentRoad.getLaneSectionById( actor.laneSectionId );
		const currentLaneId = actor.laneId;
		const currentLane = currentLaneSection.getLaneById( currentLaneId );

		let nextLaneId: number;
		let nextLane: TvLane;
		let nextRoad: TvRoad;

		// we want dummy
		// not smart moves
		// for smart moved we will use another controller
		// this.followFrontVehicle( actor );

		if ( actor.sCoordinate > currentRoad.length ) {

			if ( actor.direction > 0 ) {

				const successor = currentRoad.successor;

				if ( !successor ) {

					actor.disable();

				} else {

					const contactPoint = successor.contactPoint;

					// find road
					if ( successor.elementType == 'road' ) {

						nextRoad = this.openDrive.getRoadById( successor.elementId );
						nextLaneId = currentLane.successorExists ? currentLane.succcessor : currentLane.id;

					} else if ( successor.elementType == 'junction' ) {

						const junction = this.openDrive.getJunctionById( successor.elementId );
						const connection = junction.getRandomConnectionFor( currentRoad.id, currentLaneId );

						nextRoad = this.openDrive.getRoadById( connection.connectingRoad );
						nextLaneId = connection.getToLaneId( currentLaneId );
					}

					// update s-coordinate
					if ( contactPoint === TvContactPoint.END ) {

						actor.direction = -1;
						actor.sCoordinate = nextRoad.length - ( actor.sCoordinate - currentRoad.length );

					} else {

						actor.direction = 1;
						actor.sCoordinate = actor.sCoordinate - currentRoad.length;

					}

					// find laneSection
					const nextLaneSection = nextRoad.getLaneSectionAt( actor.sCoordinate );

					// find lane
					nextLane = nextLaneSection.getLaneById( nextLaneId );

					// console.info( currentRoad, currentLaneSection, currentLane, actor );
					// console.info( nextRoad, nextLaneSection, nextLane, nextLaneId );

					actor.roadId = nextRoad.id;
					actor.laneSectionId = nextLaneSection.id;
					actor.laneId = nextLane.id;

				}

			}

		} else if ( actor.sCoordinate < 0 ) {

			const predecessor = currentRoad.predecessor;

			if ( !predecessor ) {

				actor.disable();

			} else {

				const contactPoint = predecessor.contactPoint;

				// find road
				if ( predecessor.elementType == 'road' ) {

					nextRoad = this.openDrive.getRoadById( predecessor.elementId );
					nextLaneId = currentLane.predecessorExists ? currentLane.predecessor : currentLane.id;

				} else if ( predecessor.elementType == 'junction' ) {

					const junction = this.openDrive.getJunctionById( predecessor.elementId );
					const connection = junction.getRandomConnectionFor( currentRoad.id, currentLaneId );

					nextRoad = this.openDrive.getRoadById( connection.connectingRoad );
					nextLaneId = connection.getToLaneId( currentLaneId );
				}

				// update s-coordinate
				if ( contactPoint === TvContactPoint.END ) {

					actor.direction = -1;
					actor.sCoordinate = nextRoad.length + actor.sCoordinate;

				} else {

					actor.direction = 1;
					actor.sCoordinate = -1 * actor.sCoordinate;

				}

				// find laneSection
				const nextLaneSection = nextRoad.getLaneSectionAt( actor.sCoordinate );

				try {

					nextLane = nextLaneSection.getLaneById( nextLaneId );

					actor.roadId = nextRoad.id;
					actor.laneSectionId = nextLaneSection.id;
					actor.laneId = nextLane.id;

				} catch ( e ) {

					console.error( e );
					console.info( currentRoad, currentLaneSection, currentLane, actor );
					console.info( nextRoad, nextLaneSection, nextLane, nextLaneId );

				}

				// console.info( currentRoad, currentLaneSection, currentLane, actor );
				// console.info( nextRoad, nextLaneSection, nextLane, nextLaneId );
			}

		} else {

			// positive direction
			if ( actor.direction > 0 && actor.sCoordinate > currentLaneSection.endS ) {

				actor.laneSectionId += 1;
				actor.laneId = currentLane.getSuccessor();

			} else if ( actor.direction < 0 && actor.sCoordinate < currentLaneSection.s ) {

				actor.laneSectionId -= 1;
				actor.laneId = currentLane.getPredecessor();

			} else {

				// console.warn( 'uknown situation' );

			}

			const refPos = new TvPosTheta();

			const position = TvMapQueries.getLanePosition( actor.roadId, actor.laneId, actor.sCoordinate, actor.laneOffset, refPos );

			actor.gameObject.position.copy( position );

			// right lane move forward
			// left lane traffic move opposite
			// actor.direction = obj.getLaneId() > 0 ? -1 : 1;

			actor.gameObject.rotation.set( 0, 0, refPos.hdg - Maths.M_PI_2 );

			actor.sCoordinate += actor.speed * actor.direction * Maths.Speed2MPH * Time.deltaTime;
		}

	}

	private followFrontVehicle ( actor: EntityObject ) {

		// my current road s + 10
		//

		// const vehiclesInFront = this.getVehiclesInFront( actor );

		const entityInFront = [ ...TvScenarioInstance.openScenario.objects.values() ].find( otherActor => {
			if (
				otherActor.roadId == actor.roadId &&
				otherActor.laneSectionId == actor.laneSectionId &&
				otherActor.laneId == actor.laneId &&
				otherActor.name != actor.name
			) {

				let distance: number = 0;

				if ( actor.direction > 0 ) {

					distance = ( otherActor.sCoordinate - actor.sCoordinate );


				} else {

					distance = ( actor.sCoordinate - otherActor.sCoordinate );

				}

				const inFront = distance > 0;

				if ( inFront && distance <= 10 && otherActor.speed < actor.speed ) {

					actor.speed = otherActor.speed;
					return true;

				}

				return false;

			}
		} );

		// if ( entityInFront.length > 0 ) {
		//
		//     // console.log( 'entity-in-front', actor, entityInFront );
		//     if ( actor.speed != entityInFront[ 0 ].speed ) {
		//
		//         const ttc = Math.abs( actor.sCoordinate - entityInFront[ 0 ].sCoordinate );
		//         const action = new SpeedAction( new SpeedDynamics( DynamicsShape.linear, 1 ), new AbsoluteTarget( entityInFront[ 0 ].speed ) );
		//
		//         action.execute( actor as EntityObject );
		//
		//     }
		//
		// } else {
		//
		//     if ( actor.speed != actor.desiredSpeed ) {
		//
		//         const ttc = Math.abs( actor.sCoordinate - entityInFront[ 0 ].sCoordinate );
		//         const action = new SpeedAction( new SpeedDynamics( DynamicsShape.linear, 1 ), new AbsoluteTarget( actor.desiredSpeed ) );
		//
		//         action.execute( actor as EntityObject );
		//
		//     }
		//
		// }

		if ( !entityInFront ) {

			const road = this.openDrive.roads.get( actor.roadId );
			const maxSpeed = road.findMaxSpeedAt( actor.sCoordinate );

			const desiredSpeed = Math.min( maxSpeed, actor.maxSpeed );

			if ( desiredSpeed == 0 ) {

				actor.speed = desiredSpeed;

			} else if ( actor.speed < desiredSpeed ) {

				actor.speed += 0.1;

			}

		} else {

			// console.log( 'vehicle-in-front' );

		}

	}

	private getVehiclesInFront ( actor: EntityObject ) {

		const currentRoad = this.openDrive.getRoadById( actor.roadId );

		let nextRoad: TvRoad;

		if ( actor.direction > 0 && currentRoad.successor ) {

			nextRoad = DefaultVehicleController.getSuccessorRoad( currentRoad, this.openDrive );

		} else if ( actor.direction < 0 && currentRoad.predecessor ) {


		}

		const vehicles: EntityObject[] = [];

		ScenarioDirectorService.traffic.get( currentRoad.id ).forEach( item => vehicles.push( item ) );

		if ( nextRoad ) {

			ScenarioDirectorService.traffic.get( nextRoad.id ).forEach( item => vehicles.push( item ) );

		}

		const nextVehicle = vehicles.find( otherActor => {

			let distance: number = 0;

			if ( actor.direction > 0 ) {

				distance = ( otherActor.sCoordinate - actor.sCoordinate );


			} else {

				distance = ( actor.sCoordinate - otherActor.sCoordinate );

			}

			const inFront = distance > 0;

			if ( inFront && distance <= 5 ) {

				actor.speed = otherActor.speed;
				return true;

			} else if ( inFront && distance <= 10 ) {

				actor.speed = otherActor.speed;
				return true;

			}

			return false;

		} );
	}
}

