#!/usr/bin/env node

/**
 * CLI 执行入口
 */

import { CLI } from './cli/index';

const cli = new CLI();
cli.run();