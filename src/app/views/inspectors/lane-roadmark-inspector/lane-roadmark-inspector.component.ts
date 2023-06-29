/*
 * Copyright Truesense AI Solutions Pvt Ltd, All Rights Reserved.
 */

import { Component, OnDestroy, OnInit } from '@angular/core';

import { RemoveRoadmarkCommand } from '../../../core/commands/remove-roadmark-command';
import { SetRoadmarkValueCommand } from '../../../core/commands/set-roadmark-value-command';
import { BaseInspector } from '../../../core/components/base-inspector.component';
import { IComponent } from '../../../core/game-object';
import { TvRoadMarkTypes } from '../../../modules/tv-map/models/tv-common';
import { TvLaneRoadMark } from '../../../modules/tv-map/models/tv-lane-road-mark';
import { CommandHistory } from '../../../services/command-history';

@Component( {
	selector: 'app-lane-roadmark-inspector',
	templateUrl: './lane-roadmark-inspector.component.html',
	styleUrls: [ './lane-roadmark-inspector.component.css' ]
} )
export class LaneRoadmarkInspectorComponent extends BaseInspector implements OnInit, IComponent, OnDestroy {

	data: TvLaneRoadMark;

	constructor () {
		super();
	}

	get roadMark () {
		return this.data;
	}

	get lane () {
		return this.data;
	}

	get types () {
		return TvRoadMarkTypes;
	}

	// get roadmarks (): OdLaneRoadMark[] {
	//     return this.data.getLaneRoadMarkVector();
	// }

	ngOnInit () {


	}

	ngOnDestroy () {


	}

	onDelete () {

		CommandHistory.execute( new RemoveRoadmarkCommand( this.roadMark, this.roadMark.lane ) );

	}

	onWidthChanged ( $width ) {

		CommandHistory.execute( ( new SetRoadmarkValueCommand( this.roadMark, 'width', $width ) ) );

	}

	onTypeChanged ( $event: TvRoadMarkTypes ) {

		// if ( item.type == $event.value ) return;

		CommandHistory.execute( ( new SetRoadmarkValueCommand( this.roadMark, 'type', $event ) ) );

	}

	onWeightChanged ( $weight ) {

		CommandHistory.execute( ( new SetRoadmarkValueCommand( this.roadMark, 'weight', $weight ) ) );

	}

	onColorChanged ( $color ) {

		CommandHistory.execute( ( new SetRoadmarkValueCommand( this.roadMark, 'color', $color ) ) );

	}
}
