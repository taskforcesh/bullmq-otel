import {
  MetricOptions as OtelMetricOptions,
} from '@opentelemetry/api';

/**
 * Meter interface
 *
 * The meter is responsible for creating metric instruments.
 */
export interface Meter {
  /**
   * Creates a new Counter metric instrument.
   *
   * @param name - the name of the counter
   * @param options - optional configuration for the counter
   * @returns a Counter instance
   */
  createCounter(name: string, options?: OtelMetricOptions): Counter;

  /**
   * Creates a new Histogram metric instrument.
   *
   * @param name - the name of the histogram
   * @param options - optional configuration for the histogram
   * @returns a Histogram instance
   */
  createHistogram(name: string, options?: OtelMetricOptions): Histogram;

  /**
   * Creates a new Gauge metric instrument.
   *
   * A gauge is a metric that represents a single numerical value that can
   * arbitrarily go up and down. Gauges are typically used for measured values
   * like current memory usage or queue sizes.
   *
   * @param name - the name of the gauge
   * @param options - optional configuration for the gauge
   * @returns a Gauge instance
   */
  createGauge(name: string, options?: OtelMetricOptions): Gauge;
}

/**
 * Options for creating metric instruments
 */
export interface MetricOptions {
  /**
   * Human-readable description of the metric
   */
  description?: string;

  /**
   * Unit of measurement for the metric (e.g., 'ms', 'bytes', '1')
   */
  unit?: string;
}

/**
 * Counter metric interface
 *
 * A counter is a cumulative metric that represents a single monotonically
 * increasing value. Counters are typically used to count requests, completed
 * tasks, errors, etc.
 */
export interface Counter {
  /**
   * Adds a value to the counter.
   *
   * @param value - the value to add (must be non-negative)
   * @param attributes - optional attributes to associate with this measurement
   */
  add(value: number, attributes?: Attributes): void;
}

/**
 * Histogram metric interface
 *
 * A histogram is a metric that samples observations and counts them in
 * configurable buckets. Typically used for measuring durations or sizes.
 */
export interface Histogram {
  /**
   * Records a value in the histogram.
   *
   * @param value - the value to record
   * @param attributes - optional attributes to associate with this measurement
   */
  record(value: number, attributes?: Attributes): void;
}

/**
 * Gauge metric interface
 *
 * A gauge is a synchronous instrument which can be used to record
 * non-additive value(s) (e.g. the current queue size) when changes occur.
 */
export interface Gauge {
  /**
   * Records a value for the gauge.
   *
   * @param value - the value to record
   * @param attributes - optional attributes to associate with this measurement
   */
  record(value: number, attributes?: Attributes): void;
}

export interface Attributes {
  [attribute: string]: AttributeValue | undefined;
}

export type AttributeValue =
  | string
  | number
  | boolean
  | Array<null | undefined | string>
  | Array<null | undefined | number>
  | Array<null | undefined | boolean>;
