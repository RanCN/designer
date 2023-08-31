/*
 * Copyright Truesense AI Solutions Pvt Ltd, All Rights Reserved.
 */

import { EventEmitter } from '@angular/core';
import { StoryboardEvent } from '../services/scenario-director.service';
import { TvAction } from './tv-action';
import { StoryboardElementState, StoryboardElementType } from './tv-enums';
import { TvEvent } from './tv-event';
import { ParameterDeclaration } from './tv-parameter-declaration';

/**
 * one Maneuver is used to group instances of Event.
 * Two instances of Maneuver may also be used, each hosting
 * one Event. Both alternatives yield the same simulation
 * outcome, as long as each Event retain its startTrigger.
 */
export class Maneuver {

	private static count = 1;

	private parameterDeclarations: ParameterDeclaration[] = [];

	public events: TvEvent[] = [];

	public hasStarted: boolean;
	public isCompleted: boolean;
	public eventIndex: number = 0;

	public completed = new EventEmitter<StoryboardEvent>();

	constructor ( public name: string ) {

		Maneuver.count++;

	}

	static getNewName ( name = 'MyManeuver' ) {

		return `${ name }${ this.count }`;

	}

	addEvent ( event: TvEvent ) {

		this.events.push( event );

		event.completed.subscribe( e => this.onEventCompleted( e ) );

		return event;

	}


	addNewEvent ( name: string, priority: string = 'overwrite' ) {

		// const hasName = ScenarioInstance.db.has_event( name );

		// if ( hasName ) throw new Error( 'Event name already used' );

		const event = new TvEvent( name, priority );

		this.addEvent( event );

		return event;
	}

	private onEventCompleted ( storyEvent: StoryboardEvent ) {

		this.eventIndex++;

		let allCompleted = true;

		for ( const event of this.events ) {

			if ( !event.isCompleted ) {

				allCompleted = false;

				break;

			}
		}

		if ( allCompleted ) {

			this.isCompleted = true;

			this.completed.emit( {
				name: this.name,
				type: StoryboardElementType.maneuver,
				state: StoryboardElementState.endTransition
			} );

		}
	}

	addParameterDeclaration ( parameterDeclaration: ParameterDeclaration ) {
		this.parameterDeclarations.push( parameterDeclaration );
	}
}

/**
 * @deprecated dont use this, migration to only event
 */
export class EventAction {

	constructor (
		public name?: string,
		public action?: TvAction
	) {
	}

}
