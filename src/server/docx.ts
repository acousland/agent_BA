import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType
} from 'docx';
import type { TopicState } from './types.js';
import { loadConfig } from './config/loader.js';

export async function generateDocx(state: TopicState): Promise<Buffer> {
  const config = loadConfig();

  const sections: Paragraph[] = [];

  // Title
  sections.push(
    new Paragraph({
      text: config.docx.title,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    })
  );

  // Session ID
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Session ID: ${state.sessionId}`,
          italics: true
        })
      ],
      spacing: { after: 400 }
    })
  );

  // For each topic
  config.topics.forEach(topicConfig => {
    const topicData = state.topics[topicConfig.id];

    if (!topicData || topicData.status === 'NotStarted') {
      return;
    }

    // Topic heading
    sections.push(
      new Paragraph({
        text: topicConfig.title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      })
    );

    // Collected fields
    if (Object.keys(topicData.fields).length > 0) {
      sections.push(
        new Paragraph({
          text: 'Collected Information:',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 }
        })
      );

      topicConfig.fields.forEach(field => {
        const fieldValue = topicData.fields[field.key];
        const value: string =
          fieldValue == null || (Array.isArray(fieldValue) && fieldValue.length === 0)
            ? 'Not provided'
            : Array.isArray(fieldValue)
              ? fieldValue.join(', ')
              : fieldValue;
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${field.label}: `,
                bold: true
              }),
              new TextRun({
                text: value
              })
            ],
            spacing: { after: 100 }
          })
        );
      });
    }

    // Conversation transcript
    if (topicData.transcript.length > 0) {
      sections.push(
        new Paragraph({
          text: 'Conversation:',
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 }
        })
      );

      topicData.transcript.forEach(msg => {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${msg.role === 'user' ? 'User' : 'Assistant'}: `,
                bold: true
              }),
              new TextRun({
                text: msg.text
              })
            ],
            spacing: { after: 100 }
          })
        );
      });
    }
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: sections
      }
    ]
  });

  return await Packer.toBuffer(doc);
}
