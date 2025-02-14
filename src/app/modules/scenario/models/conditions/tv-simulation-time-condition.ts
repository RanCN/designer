/*
 * Copyright Truesense AI Solutions Pvt Ltd, All Rights Reserved.
 */

import { Time } from '../../../../core/time';
import { ConditionType, Rule } from '../tv-enums';
import { ValueCondition } from './value-condition';

export class SimulationTimeCondition extends ValueCondition {

	public readonly conditionType = ConditionType.ByValue_SimulationTime;

	public label: string = 'SimulationTimeCondition';

	constructor ( public value: number = 0, public rule: Rule = Rule.GreaterThan ) {
		super();
	}

	hasPassed (): boolean {

		if ( this.passed ) {

			return true;

		} else {

			return this.passed = this.hasRulePassed( this.rule, Time.inSeconds, this.value );

		}
	}
}
