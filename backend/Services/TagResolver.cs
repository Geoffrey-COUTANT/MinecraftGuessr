using System;

namespace MinecraftGuessr.Services
{
    public static class TagResolver
    {
        private static bool IsWooden(string itemId)
        {
            var lower = itemId.ToLowerInvariant();
            return lower.Contains("planks") || 
                   lower.Contains("wood") || 
                   lower.Contains("crimson") || 
                   lower.Contains("warped") || 
                   lower.Contains("bamboo") || 
                   lower.Contains("cherry") || 
                   lower.Contains("mangrove") || 
                   lower.Contains("dark_oak") || 
                   lower.Contains("acacia") || 
                   lower.Contains("birch") || 
                   lower.Contains("jungle") || 
                   lower.Contains("spruce") || 
                   lower.Contains("oak") ||
                   lower.Contains("pale_oak");
        }

        public static bool MatchesTag(string itemId, string tagId)
        {
            if (!tagId.StartsWith("#")) return itemId == tagId;

            var tag = tagId.Substring(1).ToLowerInvariant();
            var item = itemId.ToLowerInvariant().Replace("minecraft:", "");

            switch (tag)
            {
                case "minecraft:planks":
                    return item.EndsWith("_planks");

                case "minecraft:logs":
                case "minecraft:logs_that_burn":
                    return item.EndsWith("_log") || item.EndsWith("_wood") || item.EndsWith("_stem") || item.EndsWith("_hyphae") || item.Equals("bamboo_block");

                case "minecraft:dyes":
                    return item.EndsWith("_dye");

                case "minecraft:wool":
                    return item.EndsWith("_wool");

                case "minecraft:wool_carpets":
                    return item.EndsWith("_carpet") && !item.Equals("moss_carpet");

                case "minecraft:banners":
                    return item.EndsWith("_banner");

                case "minecraft:shulker_boxes":
                    return item.EndsWith("shulker_box");

                case "minecraft:stone_crafting_materials":
                    return item.Equals("cobblestone") || item.Equals("blackstone") || item.Equals("cobbled_deepslate") || 
                           item.Equals("andesite") || item.Equals("diorite") || item.Equals("granite") || item.Equals("stone");

                case "minecraft:stone_tool_materials":
                    return item.Equals("cobblestone") || item.Equals("blackstone") || item.Equals("cobbled_deepslate");

                case "minecraft:iron_tool_materials":
                    return item.Equals("iron_ingot");

                case "minecraft:gold_tool_materials":
                    return item.Equals("gold_ingot");

                case "minecraft:diamond_tool_materials":
                    return item.Equals("diamond");

                case "minecraft:copper_tool_materials":
                    return item.Equals("copper_ingot");

                case "minecraft:netherite_tool_materials":
                    return item.Equals("netherite_ingot");

                case "minecraft:wooden_tool_materials":
                    return item.EndsWith("_planks");

                case "minecraft:coals":
                    return item.Equals("coal") || item.Equals("charcoal");

                case "minecraft:sand":
                    return item.Equals("sand") || item.Equals("red_sand");

                case "minecraft:wooden_slabs":
                    return item.EndsWith("_slab") && IsWooden(item);

                case "minecraft:wooden_stairs":
                    return item.EndsWith("_stairs") && IsWooden(item);

                case "minecraft:wooden_buttons":
                    return item.EndsWith("_button") && IsWooden(item);

                case "minecraft:wooden_pressure_plates":
                    return item.EndsWith("_pressure_plate") && IsWooden(item);

                case "minecraft:wooden_doors":
                    return item.EndsWith("_door") && IsWooden(item);

                case "minecraft:wooden_trapdoors":
                    return item.EndsWith("_trapdoor") && IsWooden(item);

                case "minecraft:wooden_fences":
                    return item.EndsWith("_fence") && IsWooden(item);

                case "minecraft:terracotta":
                    return item.Equals("terracotta") || item.EndsWith("_terracotta");

                case "minecraft:stained_glass":
                    return item.EndsWith("_stained_glass");

                case "minecraft:stained_glass_panes":
                    return item.EndsWith("_stained_glass_pane");

                case "minecraft:trim_materials":
                    return item.Equals("iron_ingot") || item.Equals("gold_ingot") || item.Equals("diamond") || 
                           item.Equals("emerald") || item.Equals("redstone") || item.Equals("lapis_lazuli") || 
                           item.Equals("amethyst_shard") || item.Equals("netherite_ingot") || item.Equals("copper_ingot") || 
                           item.Equals("quartz");

                case "minecraft:trimmable_armor":
                    return item.EndsWith("_helmet") || item.EndsWith("_chestplate") || item.EndsWith("_leggings") || item.EndsWith("_boots");

                case "minecraft:bamboo_blocks":
                    return item.Equals("bamboo_block") || item.Equals("stripped_bamboo_block");

                case "minecraft:cherry_logs":
                    return item.Equals("cherry_log") || item.Equals("cherry_wood") || item.Equals("stripped_cherry_log") || item.Equals("stripped_cherry_wood");

                case "minecraft:oak_logs":
                    return item.Equals("oak_log") || item.Equals("oak_wood") || item.Equals("stripped_oak_log") || item.Equals("stripped_oak_wood");

                case "minecraft:crimson_stems":
                    return item.Equals("crimson_stem") || item.Equals("crimson_hyphae") || item.Equals("stripped_crimson_stem") || item.Equals("stripped_crimson_hyphae");

                case "minecraft:warped_stems":
                    return item.Equals("warped_stem") || item.Equals("warped_hyphae") || item.Equals("stripped_warped_stem") || item.Equals("stripped_warped_hyphae");

                case "minecraft:mangrove_logs":
                    return item.Equals("mangrove_log") || item.Equals("mangrove_wood") || item.Equals("stripped_mangrove_log") || item.Equals("stripped_mangrove_wood");

                case "minecraft:dark_oak_logs":
                    return item.Equals("dark_oak_log") || item.Equals("dark_oak_wood") || item.Equals("stripped_dark_oak_log") || item.Equals("stripped_dark_oak_wood");

                case "minecraft:acacia_logs":
                    return item.Equals("acacia_log") || item.Equals("acacia_wood") || item.Equals("stripped_acacia_log") || item.Equals("stripped_acacia_wood");

                case "minecraft:birch_logs":
                    return item.Equals("birch_log") || item.Equals("birch_wood") || item.Equals("stripped_birch_log") || item.Equals("stripped_birch_wood");

                case "minecraft:jungle_logs":
                    return item.Equals("jungle_log") || item.Equals("jungle_wood") || item.Equals("stripped_jungle_log") || item.Equals("stripped_jungle_wood");

                case "minecraft:spruce_logs":
                    return item.Equals("spruce_log") || item.Equals("spruce_wood") || item.Equals("stripped_spruce_log") || item.Equals("stripped_spruce_wood");

                case "minecraft:pale_oak_logs":
                    return item.Equals("pale_oak_log") || item.Equals("pale_oak_wood") || item.Equals("stripped_pale_oak_log") || item.Equals("stripped_pale_oak_wood");
            }

            // Fallback: simple string match if tag name contains item name or vice versa
            return item.Contains(tag) || tag.Contains(item);
        }
    }
}
