/*
 * Copyright Truesense AI Solutions Pvt Ltd, All Rights Reserved.
 */

import { Component, Input } from '@angular/core';
import { EntityCondition } from 'app/modules/scenario/models/conditions/entity-condition';
import { TimeHeadwayCondition } from 'app/modules/scenario/models/conditions/tv-time-headway-condition';
import { Rule } from 'app/modules/scenario/models/tv-enums';

@Component( {
	selector: 'app-time-headway-condition-editor',
	templateUrl: './time-headway-condition-editor.component.html',
	styleUrls: [ './time-headway-condition-editor.component.scss' ]
} )
export class TimeHeadwayConditionEditorComponent {

	@Input() condition: EntityCondition;

	rules = Rule;

	get timeHeadwayCondition () {

		return this.condition as TimeHeadwayCondition;

	}

	constructor () {


	}

	onTargetEntityChanged ( $targetEntity: string ) {

		this.timeHeadwayCondition.setTargetEntity( $targetEntity );

	}

	onRuleChanged ( $rule: Rule ) {

		this.timeHeadwayCondition.setRule( $rule );

	}

	onValueChanged ( $event: number ) {

		this.timeHeadwayCondition.value = $event;

	}

	onFreespaceChanged ( $event: any ) {

		this.timeHeadwayCondition.freespace = $event === 'true';

	}

	onAlongRouteChanged ( $event: any ) {

		this.timeHeadwayCondition.alongRoute = $event === 'true';

	}
}
