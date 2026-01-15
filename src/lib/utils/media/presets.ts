/**
 * Media 处理预设配置
 * 从 Rust 代码迁移：src-tauri/src/media/audio.rs 和 video.rs
 */

import type { RemoveMediaRule } from './types.js';
import { RemoveMediaPreset } from '$lib/types/enums.js';

/**
 * 音频预设配置
 * 对应 Rust: AUDIO_PRESETS (audio.rs:43-69)
 */
export const AUDIO_PRESETS: Record<
	string,
	{
		/** 执行器名称（如 'ffmpeg', 'flac', 'oggenc'） */
		executor: string;
		/** 输出格式（如 'flac', 'wav', 'ogg'） */
		outputFormat: string;
		/** 额外的命令行参数 */
		arguments?: string[];
	}
> = {
	FLAC: {
		executor: 'flac',
		outputFormat: 'flac',
		arguments: ['--keep-foreign-metadata-if-present', '--best', '-f']
	},
	FLAC_FFMPEG: {
		executor: 'ffmpeg',
		outputFormat: 'flac'
	},
	WAV_FROM_FLAC: {
		executor: 'flac',
		outputFormat: 'wav',
		arguments: ['-d', '--keep-foreign-metadata-if-present', '-f']
	},
	WAV_FFMPEG: {
		executor: 'ffmpeg',
		outputFormat: 'wav'
	},
	OGG_Q10: {
		executor: 'oggenc',
		outputFormat: 'ogg',
		arguments: ['-q10']
	},
	OGG_FFMPEG: {
		executor: 'ffmpeg',
		outputFormat: 'ogg'
	}
};

/**
 * 视频预设配置
 * 对应 Rust: VIDEO_PRESETS (video.rs:115-190)
 */
export const VIDEO_PRESETS: Record<
	string,
	{
		/** 执行器名称 */
		executor: string;
		/** 输入参数 */
		inputArgs: string[];
		/** 滤镜参数 */
		filterArgs: string[];
		/** 输出文件扩展名 */
		outputExt: string;
		/** 输出视频编码 */
		outputCodec: string;
		/** 额外参数 */
		extraArgs: string[];
	}
> = {
	// 512x512 预设
	AVI_512X512: {
		executor: 'ffmpeg',
		inputArgs: ['-hide_banner', '-i'],
		filterArgs: [
			'-filter_complex',
			'[0:v]scale=512:512:force_original_aspect_ratio=increase,crop=512:512:(ow-iw)/2:(oh-ih)/2,boxblur=20[v1];[0:v]scale=512:512:force_original_aspect_ratio=decrease[v2];[v1][v2]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2[vid]',
			'-map',
			'[vid]'
		],
		outputExt: 'avi',
		outputCodec: 'mpeg4',
		extraArgs: ['-an', '-q:v', '8']
	},
	WMV2_512X512: {
		executor: 'ffmpeg',
		inputArgs: ['-hide_banner', '-i'],
		filterArgs: [
			'-filter_complex',
			'[0:v]scale=512:512:force_original_aspect_ratio=increase,crop=512:512:(ow-iw)/2:(oh-ih)/2,boxblur=20[v1];[0:v]scale=512:512:force_original_aspect_ratio=decrease[v2];[v1][v2]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2[vid]',
			'-map',
			'[vid]'
		],
		outputExt: 'wmv',
		outputCodec: 'wmv2',
		extraArgs: ['-an', '-q:v', '8']
	},
	MPEG1VIDEO_512X512: {
		executor: 'ffmpeg',
		inputArgs: ['-hide_banner', '-i'],
		filterArgs: [
			'-filter_complex',
			'[0:v]scale=512:512:force_original_aspect_ratio=increase,crop=512:512:(ow-iw)/2:(oh-ih)/2,boxblur=20[v1];[0:v]scale=512:512:force_original_aspect_ratio=decrease[v2];[v1][v2]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2[vid]',
			'-map',
			'[vid]'
		],
		outputExt: 'mpg',
		outputCodec: 'mpeg1video',
		extraArgs: ['-an', '-b:v', '1500k']
	},
	// 480p 预设
	AVI_480P: {
		executor: 'ffmpeg',
		inputArgs: ['-hide_banner', '-i'],
		filterArgs: [
			'-filter_complex',
			'[0:v]scale=640:480:force_original_aspect_ratio=increase,crop=640:480:(ow-iw)/2:(oh-ih)/2,boxblur=20[v1];[0:v]scale=640:480:force_original_aspect_ratio=decrease[v2];[v1][v2]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2[vid]',
			'-map',
			'[vid]'
		],
		outputExt: 'avi',
		outputCodec: 'mpeg4',
		extraArgs: ['-an', '-q:v', '8']
	},
	WMV2_480P: {
		executor: 'ffmpeg',
		inputArgs: ['-hide_banner', '-i'],
		filterArgs: [
			'-filter_complex',
			'[0:v]scale=640:480:force_original_aspect_ratio=increase,crop=640:480:(ow-iw)/2:(oh-ih)/2,boxblur=20[v1];[0:v]scale=640:480:force_original_aspect_ratio=decrease[v2];[v1][v2]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2[vid]',
			'-map',
			'[vid]'
		],
		outputExt: 'wmv',
		outputCodec: 'wmv2',
		extraArgs: ['-an', '-q:v', '8']
	},
	MPEG1VIDEO_480P: {
		executor: 'ffmpeg',
		inputArgs: ['-hide_banner', '-i'],
		filterArgs: [
			'-filter_complex',
			'[0:v]scale=640:480:force_original_aspect_ratio=increase,crop=640:480:(ow-iw)/2:(oh-ih)/2,boxblur=20[v1];[0:v]scale=640:480:force_original_aspect_ratio=decrease[v2];[v1][v2]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2[vid]',
			'-map',
			'[vid]'
		],
		outputExt: 'mpg',
		outputCodec: 'mpeg1video',
		extraArgs: ['-an', '-b:v', '1500k']
	}
};

/**
 * 媒体删除规则配置
 * 从 Rust 代码迁移：src-tauri/src/options/root_bigpack.rs
 */
export const REMOVE_MEDIA_RULES: Record<RemoveMediaPreset, RemoveMediaRule[]> = {
	[RemoveMediaPreset.Oraja]: [
		[['mp4'], ['avi', 'wmv', 'mpg', 'mpeg']],
		[['avi'], ['wmv', 'mpg', 'mpeg']],
		[['flac', 'wav'], ['ogg']],
		[['flac'], ['wav']],
		[['mpg'], ['wmv']]
	],
	[RemoveMediaPreset.WavFillFlac]: [[['wav'], ['flac']]],
	[RemoveMediaPreset.MpgFillWmv]: [[['mpg'], ['wmv']]]
};

/**
 * 媒体文件扩展名列表
 * 对应 Rust: MEDIA_EXT_LIST (fs.rs)
 */
export const MEDIA_EXT_LIST = [
	'.ogg',
	'.wav',
	'.flac',
	'.mp4',
	'.wmv',
	'.avi',
	'.mpg',
	'.mpeg',
	'.bmp',
	'.jpg',
	'.png'
];
