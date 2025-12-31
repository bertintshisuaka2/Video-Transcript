CREATE TABLE `transcripts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`videoId` varchar(255),
	`videoTitle` text,
	`videoUrl` text,
	`sourceType` enum('youtube','upload') NOT NULL,
	`originalLanguage` varchar(10),
	`transcriptText` text NOT NULL,
	`fileKey` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transcripts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `translations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transcriptId` int NOT NULL,
	`targetLanguage` varchar(10) NOT NULL,
	`translatedText` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `translations_id` PRIMARY KEY(`id`)
);
