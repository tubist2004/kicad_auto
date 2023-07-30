SELECT
    `partlistitem`.`part_id`,
    `distribution`.`distributor_id`,
    `distribution`.`ordercode`,
    `partlistitem`.`rank`,
    `partlistitem`.`value` as `text`,
    GREATEST(
        `price`.`min`,
        `calculationitempartlist`.`count` * `partlistitem`.`count`
    ) as count,
    `price`.`value` as `price`,
    "EUR" as `currency`,
    GREATEST(
        `price`.`min`,
        `calculationitempartlist`.`count` * `partlistitem`.`count`
    ) * `price`.`value` as sum
FROM
    `calculationitempartlist`
    JOIN `partlistitem` ON `partlistitem`.`partlist_id` = `calculationitempartlist`.`partlist_id`
    JOIN `source` ON `partlistitem`.`part_id` = `source`.`part_id`
    JOIN `distribution` ON `distribution`.`source_id` = `source`.`id`
    JOIN `priceineur` as `price` ON `distribution`.`id` = `price`.`distribution_id`
    INNER JOIN (
        SELECT
            `price`.`id`
        FROM
            `calculationitempartlist`
            JOIN `partlistitem` ON `partlistitem`.`partlist_id` = `calculationitempartlist`.`partlist_id`
            JOIN `source` ON `partlistitem`.`part_id` = `source`.`part_id`
            JOIN `distribution` ON `distribution`.`source_id` = `source`.`id`
            JOIN `priceineur` as `price` ON `distribution`.`id` = `price`.`distribution_id`
            INNER JOIN (
                SELECT
                    `partlistitem`.`part_id`,
                    MIN(
                        GREATEST(
                            `price`.`min`,
                            `calculationitempartlist`.`count` * `partlistitem`.`count`
                        ) * `price`.`value`
                    ) as sum
                FROM
                    `calculationitempartlist`
                    JOIN `partlistitem` ON `partlistitem`.`partlist_id` = `calculationitempartlist`.`partlist_id`
                    JOIN `source` ON `partlistitem`.`part_id` = `source`.`part_id`
                    JOIN `distribution` ON `distribution`.`source_id` = `source`.`id`
                    JOIN `priceineur` as `price` ON `distribution`.`id` = `price`.`distribution_id`
                GROUP BY
                    `part_id`
            ) b ON `partlistitem`.`part_id` = b.`part_id`
            AND b.`sum` = (GREATEST(
                `price`.`min`,
                `calculationitempartlist`.`count` * `partlistitem`.`count`
            ) * `price`.`value`)
        WHERE
            `calculation_id` = ?
            AND `partlistitem`.`part_id` IS NOT NULL
        GROUP BY
            `partlistitem`.`part_id`
    ) c ON `price`.`id` = `c`.`id`;